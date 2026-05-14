"use client";

import { usePathname } from "next/navigation";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { slug: "business", label: "Business" },
  { slug: "services", label: "Services" },
  { slug: "hours", label: "Hours" },
  { slug: "voice", label: "Voice" },
  { slug: "calendar", label: "Calendar" },
  { slug: "plan", label: "Plan" },
];

export function WizardSteps() {
  const pathname = usePathname();
  const currentSlug = pathname.split("/")[2];
  const currentIdx = STEPS.findIndex((s) => s.slug === currentSlug);

  return (
    <ol className="flex items-center gap-2 text-xs">
      {STEPS.map((step, idx) => {
        const isPast = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        return (
          <li key={step.slug} className="flex items-center gap-2 flex-1">
            <div
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-medium",
                isPast
                  ? "bg-primary text-primary-foreground border-primary"
                  : isCurrent
                    ? "border-primary text-primary"
                    : "border-muted-foreground/30 text-muted-foreground",
              )}
            >
              {isPast ? <Check size={12} /> : idx + 1}
            </div>
            <span
              className={cn(
                "flex-1 hidden sm:inline",
                isCurrent
                  ? "text-foreground font-medium"
                  : "text-muted-foreground",
              )}
            >
              {step.label}
            </span>
            {idx < STEPS.length - 1 && (
              <div
                className={cn(
                  "h-px flex-1 sm:hidden",
                  isPast ? "bg-primary" : "bg-muted-foreground/20",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
