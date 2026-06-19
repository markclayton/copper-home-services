/**
 * DOCX → plain text via mammoth's rawText converter. Loses formatting,
 * which is fine — we're feeding chunks to an embedding model.
 */

import mammoth from "mammoth";

export async function parseDocx(buffer: Buffer): Promise<{ text: string }> {
  const result = await mammoth.extractRawText({ buffer });
  return { text: result.value ?? "" };
}
