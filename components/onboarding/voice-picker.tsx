"use client";

import { Check } from "lucide-react";
import { VOICE_OPTIONS } from "@/lib/voice/voices";

export function VoicePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {VOICE_OPTIONS.map((option) => {
        const selected = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={`flex items-start justify-between gap-3 rounded-md border px-3 py-2.5 text-left transition-colors ${
              selected
                ? "border-foreground bg-foreground/5"
                : "border-input hover:bg-muted/50"
            }`}
          >
            <div className="flex flex-col">
              <span className="text-sm font-medium">{option.label}</span>
              <span className="text-xs text-muted-foreground">
                {option.description}
              </span>
            </div>
            {selected && (
              <Check size={16} className="mt-0.5 shrink-0 text-foreground" />
            )}
          </button>
        );
      })}
    </div>
  );
}
