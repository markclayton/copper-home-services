"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatPhone } from "@/lib/format";

export function PhoneNumberCard({ phone }: { phone: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(phone);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API can fail in non-secure contexts; ignore silently.
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>Your AI receptionist number</CardDescription>
        <div className="flex items-center gap-3">
          <CardTitle className="text-2xl font-mono tracking-tight">
            {formatPhone(phone)}
          </CardTitle>
          <button
            type="button"
            onClick={copy}
            aria-label={copied ? "Copied" : "Copy phone number"}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground rounded-md border px-2 py-1 transition-colors"
          >
            {copied ? (
              <>
                <Check size={12} /> Copied
              </>
            ) : (
              <>
                <Copy size={12} /> Copy
              </>
            )}
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">
          Call this number to test your AI. Transcripts and bookings will show
          up under Calls.
        </p>
      </CardContent>
    </Card>
  );
}
