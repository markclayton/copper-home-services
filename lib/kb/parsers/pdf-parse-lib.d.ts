// The pdf-parse package only ships a type declaration for the root entry
// point. We import the /lib/pdf-parse subpath to dodge the test-file FS
// read in the root index.js, so we mirror the @types/pdf-parse shape here.

declare module "pdf-parse/lib/pdf-parse" {
  interface PdfData {
    numpages: number;
    numrender: number;
    info: Record<string, unknown>;
    metadata: unknown;
    version: string;
    text: string;
  }
  function pdfParse(
    dataBuffer: Buffer,
    options?: Record<string, unknown>,
  ): Promise<PdfData>;
  export default pdfParse;
}
