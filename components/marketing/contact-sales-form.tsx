"use client";

import { useActionState } from "react";
import { Check } from "lucide-react";
import {
  submitContactSales,
  type ContactSalesState,
} from "@/app/contact-sales/actions";

const INITIAL: ContactSalesState = { status: "idle" };

export function ContactSalesForm() {
  const [state, formAction, pending] = useActionState(
    submitContactSales,
    INITIAL,
  );

  if (state.status === "ok") {
    return (
      <div className="rounded-md border border-copper-200 bg-copper-50 p-6 flex items-start gap-4">
        <div className="rounded-full bg-copper-600 text-cream-100 p-2 shrink-0">
          <Check size={16} />
        </div>
        <div>
          <div className="font-display text-lg text-ink">Got it — thanks.</div>
          <p className="text-sm text-ink-700 mt-1 leading-relaxed">
            We&apos;ll reach out within one business day from
            info@joincopper.io. Keep an eye on your spam folder just in case.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="contact-sales-email"
          className="text-sm font-medium text-ink"
        >
          Your email <span className="text-copper-600">*</span>
        </label>
        <input
          id="contact-sales-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="owner@yourbusiness.com"
          className="rounded-md border border-ink/20 bg-cream-50 px-3 py-2.5 text-ink placeholder:text-ink-400 focus:outline-none focus:border-copper-500 focus:ring-2 focus:ring-copper-500/20"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="contact-sales-company"
          className="text-sm font-medium text-ink"
        >
          Business name <span className="text-ink-400 font-normal">(optional)</span>
        </label>
        <input
          id="contact-sales-company"
          name="company"
          type="text"
          maxLength={200}
          autoComplete="organization"
          placeholder="Acme Plumbing"
          className="rounded-md border border-ink/20 bg-cream-50 px-3 py-2.5 text-ink placeholder:text-ink-400 focus:outline-none focus:border-copper-500 focus:ring-2 focus:ring-copper-500/20"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="contact-sales-message"
          className="text-sm font-medium text-ink"
        >
          What do you need?{" "}
          <span className="text-ink-400 font-normal">(optional)</span>
        </label>
        <textarea
          id="contact-sales-message"
          name="message"
          rows={4}
          maxLength={2000}
          placeholder="Multiple locations, integrations with ServiceTitan, custom AI voice, etc."
          className="rounded-md border border-ink/20 bg-cream-50 px-3 py-2.5 text-ink placeholder:text-ink-400 focus:outline-none focus:border-copper-500 focus:ring-2 focus:ring-copper-500/20 resize-y"
        />
      </div>

      {state.status === "error" && (
        <p className="text-sm text-red-700">{state.error}</p>
      )}

      <div>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center gap-2 bg-copper-600 hover:bg-copper-700 text-cream-100 font-medium text-sm px-6 py-3 rounded-md transition-colors shadow-[0_1px_0_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.18)] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {pending ? "Sending…" : "Send inquiry"}
        </button>
      </div>
    </form>
  );
}
