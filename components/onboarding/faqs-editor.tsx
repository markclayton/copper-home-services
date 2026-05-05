"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type FaqRow = { q: string; a: string };

const EMPTY_ROW: FaqRow = { q: "", a: "" };

export function FaqsEditor({
  value,
  onChange,
}: {
  value: FaqRow[];
  onChange: (next: FaqRow[]) => void;
}) {
  function update(idx: number, patch: Partial<FaqRow>) {
    const next = value.map((row, i) => (i === idx ? { ...row, ...patch } : row));
    onChange(next);
  }

  function remove(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
  }

  function add() {
    onChange([...value, { ...EMPTY_ROW }]);
  }

  return (
    <div className="flex flex-col gap-3">
      {value.length === 0 && (
        <p className="text-sm text-muted-foreground italic">
          No FAQs yet. Add the questions you hear most.
        </p>
      )}

      {value.map((row, idx) => (
        <div key={idx} className="rounded-md border p-3 flex flex-col gap-2">
          <div className="grid gap-1">
            <Label
              htmlFor={`faq-q-${idx}`}
              className="text-xs text-muted-foreground"
            >
              Question
            </Label>
            <Input
              id={`faq-q-${idx}`}
              value={row.q}
              onChange={(e) => update(idx, { q: e.target.value })}
              placeholder="Are you licensed and insured?"
            />
          </div>
          <div className="grid gap-1">
            <Label
              htmlFor={`faq-a-${idx}`}
              className="text-xs text-muted-foreground"
            >
              Answer
            </Label>
            <textarea
              id={`faq-a-${idx}`}
              rows={2}
              value={row.a}
              onChange={(e) => update(idx, { a: e.target.value })}
              placeholder="Yes, fully licensed and insured in California."
              className="rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => remove(idx)}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 size={14} className="mr-1" /> Remove
            </Button>
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={add}
        className="self-start"
      >
        <Plus size={14} className="mr-1" /> Add FAQ
      </Button>
    </div>
  );
}
