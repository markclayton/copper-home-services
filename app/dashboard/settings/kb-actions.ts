"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { kbDocuments } from "@/lib/db/schema";
import { requireBusiness } from "@/lib/db/queries";
import { ingestText } from "@/lib/kb/ingest";
import { parsePdf } from "@/lib/kb/parsers/pdf";
import { parseDocx } from "@/lib/kb/parsers/docx";

const MAX_BYTES = 10 * 1024 * 1024;

export type UploadKbDocState = {
  ok: boolean;
  error?: string;
  status?: "ready" | "deduped" | "failed";
  title?: string;
};

/**
 * Synchronous PDF/DOCX upload from the settings KB card. We block the
 * server action on parse + embed because most SMB uploads (policies,
 * service catalogs) are small. If someone uploads a 200-page PDF we hit
 * the 10MB cap before they hit a timeout.
 */
export async function uploadKbDocument(
  _prev: UploadKbDocState,
  form: FormData,
): Promise<UploadKbDocState> {
  const { business } = await requireBusiness();

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Pick a file to upload." };
  }
  if (file.size > MAX_BYTES) {
    return {
      ok: false,
      error: `File is ${(file.size / 1024 / 1024).toFixed(1)}MB — cap is 10MB.`,
    };
  }

  const lower = file.name.toLowerCase();
  const isPdf = lower.endsWith(".pdf") || file.type === "application/pdf";
  const isDocx =
    lower.endsWith(".docx") ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (!isPdf && !isDocx) {
    return { ok: false, error: "Only PDF and DOCX files are supported today." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let text: string;
  try {
    if (isPdf) {
      const out = await parsePdf(buffer);
      text = out.text;
    } else {
      const out = await parseDocx(buffer);
      text = out.text;
    }
  } catch (err) {
    return {
      ok: false,
      error: `Couldn't read that file: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const result = await ingestText(
    business.id,
    { kind: "upload", title: file.name },
    text,
  );

  revalidatePath("/dashboard/settings");

  if (result.status === "failed") {
    return {
      ok: false,
      error: result.error ?? "Couldn't embed that file.",
      title: file.name,
      status: "failed",
    };
  }

  return {
    ok: true,
    title: file.name,
    status: result.status,
  };
}

export async function deleteKbDocument(documentId: string): Promise<void> {
  const { business } = await requireBusiness();
  await db
    .delete(kbDocuments)
    .where(
      and(
        eq(kbDocuments.id, documentId),
        eq(kbDocuments.businessId, business.id),
      ),
    );
  revalidatePath("/dashboard/settings");
}
