/**
 * PDF → plain text.
 *
 * Important: import from the lib subpath, NOT the package root. The
 * pdf-parse package's index.js does a debug-mode read of a bundled test
 * PDF when invoked without a Buffer — bundlers detect the FS read at
 * build time and either fail or warn loudly. The /lib/pdf-parse subpath
 * skips that.
 */

import pdfParse from "pdf-parse/lib/pdf-parse";

export async function parsePdf(buffer: Buffer): Promise<{
  text: string;
  pageCount: number;
}> {
  const data = await pdfParse(buffer);
  return {
    text: data.text ?? "",
    pageCount: data.numpages ?? 0,
  };
}
