"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type ServiceRow = {
  name: string;
  description?: string;
  priceRange?: string;
  typicalDuration?: string;
};

const EMPTY_ROW: ServiceRow = {
  name: "",
  description: "",
  priceRange: "",
  typicalDuration: "",
};

export function ServicesEditor({
  value,
  onChange,
}: {
  value: ServiceRow[];
  onChange: (next: ServiceRow[]) => void;
}) {
  function update(idx: number, patch: Partial<ServiceRow>) {
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
          No services yet. Add one below.
        </p>
      )}

      {value.map((row, idx) => (
        <div key={idx} className="rounded-md border p-3 flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto] items-end">
            <div className="grid gap-1">
              <Label
                htmlFor={`service-name-${idx}`}
                className="text-xs text-muted-foreground"
              >
                Service
              </Label>
              <Input
                id={`service-name-${idx}`}
                value={row.name}
                onChange={(e) => update(idx, { name: e.target.value })}
                placeholder="AC repair"
              />
            </div>
            <div className="grid gap-1">
              <Label
                htmlFor={`service-price-${idx}`}
                className="text-xs text-muted-foreground"
              >
                Price
              </Label>
              <Input
                id={`service-price-${idx}`}
                value={row.priceRange ?? ""}
                onChange={(e) => update(idx, { priceRange: e.target.value })}
                placeholder="$150 + parts"
              />
            </div>
            <div className="grid gap-1">
              <Label
                htmlFor={`service-duration-${idx}`}
                className="text-xs text-muted-foreground"
              >
                Typical duration
              </Label>
              <Input
                id={`service-duration-${idx}`}
                value={row.typicalDuration ?? ""}
                onChange={(e) =>
                  update(idx, { typicalDuration: e.target.value })
                }
                placeholder="1–2 hours"
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => remove(idx)}
              aria-label="Remove service"
            >
              <Trash2 size={16} />
            </Button>
          </div>
          <div className="grid gap-1">
            <Label
              htmlFor={`service-description-${idx}`}
              className="text-xs text-muted-foreground"
            >
              Description (optional)
            </Label>
            <textarea
              id={`service-description-${idx}`}
              rows={2}
              value={row.description ?? ""}
              onChange={(e) => update(idx, { description: e.target.value })}
              placeholder="What's included, what to expect, anything callers ask about."
              className="rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
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
        <Plus size={14} className="mr-1" /> Add service
      </Button>
    </div>
  );
}
