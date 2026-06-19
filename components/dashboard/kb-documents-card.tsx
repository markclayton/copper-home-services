"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  deleteKbDocument,
  uploadKbDocument,
  type UploadKbDocState,
} from "@/app/dashboard/settings/kb-actions";
import type { KbDocument } from "@/lib/db/schema";

const INITIAL: UploadKbDocState = { ok: false };

export function KbDocumentsCard({ documents }: { documents: KbDocument[] }) {
  const [state, formAction, pending] = useActionState(uploadKbDocument, INITIAL);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Knowledge documents</CardTitle>
        <CardDescription>
          Upload PDFs or DOCX files (policies, service catalogs, warranty
          info). The AI will search these mid-call when a question goes past
          the FAQs above.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            ref={fileInputRef}
            type="file"
            name="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-foreground file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-background hover:file:bg-foreground/90"
            disabled={pending}
          />
          <Button type="submit" disabled={pending}>
            {pending ? "Uploading…" : "Upload"}
          </Button>
        </form>

        {state.ok && state.title && (
          <p className="text-sm text-emerald-700 dark:text-emerald-400">
            {state.status === "deduped"
              ? `${state.title} matched an existing document — skipped.`
              : `Indexed ${state.title}.`}
          </p>
        )}
        {!state.ok && state.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}

        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No documents yet. Upload a service catalog or policy doc to give
            the AI more to work with.
          </p>
        ) : (
          <ul className="flex flex-col divide-y rounded-md border">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center gap-3 px-3 py-2.5"
              >
                <FileText size={16} className="text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {labelStatus(doc.status)} ·{" "}
                    {doc.chunkCount} chunk{doc.chunkCount === 1 ? "" : "s"} ·{" "}
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDeletingId(doc.id);
                    startTransition(async () => {
                      await deleteKbDocument(doc.id);
                      setDeletingId(null);
                    });
                  }}
                  disabled={deletingId === doc.id}
                  className="text-muted-foreground hover:text-destructive transition-colors p-1"
                  aria-label={`Delete ${doc.title}`}
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function labelStatus(status: KbDocument["status"]): string {
  switch (status) {
    case "ready":
      return "Indexed";
    case "queued":
      return "Queued";
    case "processing":
      return "Processing";
    case "failed":
      return "Failed";
  }
}
