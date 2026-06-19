/**
 * SMB-grade website crawler. Sitemap-first, BFS fallback, robots-aware.
 *
 * Design constraints:
 *  - SMB sites are 5-30 pages. We cap hard at MAX_PAGES.
 *  - We respect robots.txt because we're a brand-new bot and getting
 *    blocklisted would be bad.
 *  - We don't render JS. Sites that need it (very rare for plumbers,
 *    salons, dentists) won't ingest well — owners can paste their
 *    services manually as fallback. Firecrawl is the upgrade path.
 *  - We extract the "main content" by stripping nav/header/footer/script/
 *    style/aside and taking textContent of <main>, <article>, or <body>
 *    in that order. Good enough for ~85% of small business sites.
 */

import * as cheerio from "cheerio";

const MAX_PAGES = 30;
const MAX_DEPTH = 2;
const FETCH_TIMEOUT_MS = 15_000;
const USER_AGENT = "CopperBot/1.0 (+https://copperreceptionist.com/bot)";

export type CrawledPage = {
  url: string;
  title: string;
  text: string;
};

export type CrawlResult = {
  rootUrl: string;
  pages: CrawledPage[];
  /** URLs we discovered but skipped because of caps or robots.txt. Useful
   *  for the UI to say "we crawled 12 pages; 4 more skipped." */
  skipped: number;
};

export async function crawlSite(rootUrl: string): Promise<CrawlResult> {
  const root = new URL(rootUrl);
  const robots = await fetchRobots(root);

  const sitemapUrls = await tryReadSitemap(root);
  let urls: string[];
  let discoveredVia: "sitemap" | "bfs";

  if (sitemapUrls.length > 0) {
    urls = sitemapUrls;
    discoveredVia = "sitemap";
  } else {
    urls = await bfsDiscover(root, robots);
    discoveredVia = "bfs";
  }

  const filtered = urls.filter((u) => robots.allows(new URL(u).pathname));
  const skipped = urls.length - filtered.length;
  const targets = filtered.slice(0, MAX_PAGES);

  // Limit concurrency to avoid hammering the origin. 4 in flight is plenty
  // for a 30-page site and keeps us a polite citizen.
  const pages: CrawledPage[] = [];
  const queue = [...targets];
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      while (queue.length > 0) {
        const url = queue.shift()!;
        try {
          const page = await fetchAndExtract(url);
          if (page && page.text.length > 50) pages.push(page);
        } catch {
          // Swallow per-page errors — we'd rather get 28/30 pages than fail
          // the whole crawl because one URL 404s.
        }
      }
    }),
  );

  void discoveredVia;
  return {
    rootUrl: root.toString(),
    pages,
    skipped: skipped + Math.max(0, filtered.length - targets.length),
  };
}

type Robots = { allows: (path: string) => boolean };

async function fetchRobots(root: URL): Promise<Robots> {
  const robotsUrl = new URL("/robots.txt", root).toString();
  try {
    const text = await fetchTextWithTimeout(robotsUrl);
    return parseRobots(text);
  } catch {
    return { allows: () => true };
  }
}

/**
 * Bare-minimum robots.txt parser. Honors the global '*' user-agent
 * group's Disallow rules — enough to be polite without dragging in a
 * full RFC-9309 parser.
 */
function parseRobots(body: string): Robots {
  const lines = body.split("\n").map((l) => l.replace(/#.*/, "").trim());
  let inWildcard = false;
  const disallowed: string[] = [];
  for (const raw of lines) {
    if (!raw) continue;
    const [keyRaw, ...rest] = raw.split(":");
    const key = keyRaw.toLowerCase().trim();
    const value = rest.join(":").trim();
    if (key === "user-agent") {
      inWildcard = value === "*";
    } else if (inWildcard && key === "disallow" && value) {
      disallowed.push(value);
    }
  }
  return {
    allows(path: string) {
      return !disallowed.some((d) => d !== "" && path.startsWith(d));
    },
  };
}

async function tryReadSitemap(root: URL): Promise<string[]> {
  const candidates = [
    new URL("/sitemap.xml", root).toString(),
    new URL("/sitemap_index.xml", root).toString(),
  ];
  for (const url of candidates) {
    try {
      const xml = await fetchTextWithTimeout(url);
      const urls = extractUrlsFromSitemap(xml, root);
      if (urls.length > 0) return urls;
    } catch {
      /* try next */
    }
  }
  return [];
}

function extractUrlsFromSitemap(xml: string, root: URL): string[] {
  // We accept either <urlset> (page list) or <sitemapindex> (nested) shape.
  // For indexes we only pull the inner URLs of the FIRST nested sitemap to
  // bound work — SMB sites with a sitemap index almost always have one
  // inner sitemap containing all their pages.
  const $ = cheerio.load(xml, { xmlMode: true });
  const innerUrls: string[] = [];
  $("urlset > url > loc").each((_, el) => {
    const u = $(el).text().trim();
    if (u) innerUrls.push(u);
  });
  if (innerUrls.length > 0) return scopeToHost(innerUrls, root);

  const nestedSitemaps: string[] = [];
  $("sitemapindex > sitemap > loc").each((_, el) => {
    const u = $(el).text().trim();
    if (u) nestedSitemaps.push(u);
  });
  // Caller can recursively load nested sitemaps if needed; for now we only
  // surface direct URLs to keep crawl cheap.
  return scopeToHost(nestedSitemaps, root);
}

function scopeToHost(urls: string[], root: URL): string[] {
  return urls.filter((u) => {
    try {
      return new URL(u).host === root.host;
    } catch {
      return false;
    }
  });
}

async function bfsDiscover(root: URL, robots: Robots): Promise<string[]> {
  const seen = new Set<string>([root.toString()]);
  const found: string[] = [root.toString()];
  type Item = { url: string; depth: number };
  const queue: Item[] = [{ url: root.toString(), depth: 0 }];

  while (queue.length > 0 && found.length < MAX_PAGES * 2) {
    const { url, depth } = queue.shift()!;
    if (depth >= MAX_DEPTH) continue;
    try {
      const html = await fetchTextWithTimeout(url);
      const $ = cheerio.load(html);
      $("a[href]").each((_, el) => {
        const href = $(el).attr("href");
        if (!href) return;
        let absUrl: URL;
        try {
          absUrl = new URL(href, url);
        } catch {
          return;
        }
        if (absUrl.host !== root.host) return;
        absUrl.hash = "";
        const s = absUrl.toString();
        if (seen.has(s)) return;
        if (!isHtmlLikePath(absUrl.pathname)) return;
        if (!robots.allows(absUrl.pathname)) return;
        seen.add(s);
        found.push(s);
        queue.push({ url: s, depth: depth + 1 });
      });
    } catch {
      // ignore
    }
  }
  return found;
}

function isHtmlLikePath(path: string): boolean {
  // Skip obvious binaries — we can't OCR images, and CSS/JS won't contain
  // marketing content.
  return !/\.(?:png|jpe?g|gif|webp|svg|ico|css|js|pdf|zip|woff2?|ttf|mp3|mp4|mov|avi)(?:\?.*)?$/i.test(
    path,
  );
}

async function fetchAndExtract(url: string): Promise<CrawledPage | null> {
  const html = await fetchTextWithTimeout(url);
  const $ = cheerio.load(html);

  // Strip noise before extracting text.
  $(
    "script, style, noscript, nav, header, footer, aside, form, iframe, .nav, .header, .footer, .menu, .cookie, .cookies",
  ).remove();

  // Prefer <main>, then <article>, then <body>.
  const containers = ["main", "article", "[role=main]", "body"];
  let text = "";
  for (const sel of containers) {
    const el = $(sel).first();
    if (el.length === 0) continue;
    const t = el.text();
    if (t.trim().length > 100) {
      text = t;
      break;
    }
  }
  if (!text) return null;

  const title =
    $("title").first().text().trim() ||
    $("h1").first().text().trim() ||
    new URL(url).pathname;

  return {
    url,
    title: title.slice(0, 200),
    text: text.replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim(),
  };
}

async function fetchTextWithTimeout(url: string): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xml" },
      signal: ctrl.signal,
      redirect: "follow",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}
