/**
 * Token-aware text chunker. No tiktoken dep — char/4 is the standard
 * approximation for English text and accurate within ±10%.
 *
 * Strategy is recursive character split: try paragraph splits first, then
 * sentence, then word, then hard-cut. Same idea as LangChain's
 * RecursiveCharacterTextSplitter without dragging in the library.
 *
 * Target ~512 tokens (~2048 chars) per chunk with ~64 token (~256 char)
 * overlap. 512 is the embedding-retrieval sweet spot for text-embedding-3-small.
 */

const DEFAULT_TARGET_CHARS = 2048;
const DEFAULT_OVERLAP_CHARS = 256;
const HARD_MIN_CHARS = 100; // chunks smaller than this just dissolve back into neighbors

export type Chunk = {
  content: string;
  tokenCount: number;
};

export function approxTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function chunk(
  text: string,
  opts: { targetChars?: number; overlapChars?: number } = {},
): Chunk[] {
  const target = opts.targetChars ?? DEFAULT_TARGET_CHARS;
  const overlap = opts.overlapChars ?? DEFAULT_OVERLAP_CHARS;
  const cleaned = normalize(text);
  if (!cleaned) return [];
  if (cleaned.length <= target) {
    return [{ content: cleaned, tokenCount: approxTokens(cleaned) }];
  }

  const parts = recursiveSplit(cleaned, target);

  // Re-glue with overlap. The overlap is taken from the END of the previous
  // chunk so retrieval still hits boundary content.
  const out: Chunk[] = [];
  let buffer = "";
  for (const part of parts) {
    if (!buffer) {
      buffer = part;
      continue;
    }
    if (buffer.length + part.length + 1 <= target) {
      buffer = `${buffer}\n${part}`;
      continue;
    }
    out.push({ content: buffer, tokenCount: approxTokens(buffer) });
    const tail = buffer.slice(-overlap);
    buffer = `${tail}\n${part}`;
  }
  if (buffer.length >= HARD_MIN_CHARS) {
    out.push({ content: buffer, tokenCount: approxTokens(buffer) });
  } else if (out.length > 0 && buffer) {
    // Final dribble too small to stand alone — fold it into the last chunk
    // so we don't waste an embed slot on three words.
    const last = out[out.length - 1];
    last.content = `${last.content}\n${buffer}`;
    last.tokenCount = approxTokens(last.content);
  }

  return out;
}

/**
 * Collapse runs of whitespace and trim. Web/PDF text routinely has
 * unicode non-breaking spaces and lots of blank lines we don't want
 * inflating the chunk count.
 */
function normalize(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/ /g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Split text into substrings each <= target chars. Tries progressively
 * coarser delimiters: paragraph → sentence → word → hard-cut.
 */
function recursiveSplit(text: string, target: number): string[] {
  if (text.length <= target) return [text];

  const delimiters: Array<{ re: RegExp; join: string }> = [
    { re: /\n{2,}/, join: "\n\n" },
    { re: /(?<=[.!?])\s+/, join: " " },
    { re: /\s+/, join: " " },
  ];

  for (const { re } of delimiters) {
    const parts = text.split(re).filter(Boolean);
    if (parts.length < 2) continue;
    // Recursively split anything still oversize.
    const out: string[] = [];
    for (const p of parts) {
      if (p.length <= target) {
        out.push(p);
      } else {
        out.push(...recursiveSplit(p, target));
      }
    }
    return out;
  }

  // Pathological input (single token longer than target) — hard cut.
  const out: string[] = [];
  for (let i = 0; i < text.length; i += target) {
    out.push(text.slice(i, i + target));
  }
  return out;
}
