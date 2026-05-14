"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Phone, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  saveNumberStep,
  type NumberStepState,
} from "@/app/onboard/number/actions";
import { formatPhone } from "@/lib/format";
import type { Business } from "@/lib/db/schema";

const INITIAL: NumberStepState = { ok: false };

type AvailableNumber = {
  phoneNumber: string;
  friendlyName: string;
  locality: string | null;
  region: string | null;
};

type NumbersResponse = {
  numbers: AvailableNumber[];
  requestedAreaCode: string | null;
  fellBack: boolean;
};

export function NumberStepForm({
  business,
  defaultAreaCode,
}: {
  business: Business;
  defaultAreaCode: string;
}) {
  const [areaCode, setAreaCode] = useState(defaultAreaCode);
  const [numbers, setNumbers] = useState<AvailableNumber[]>([]);
  const [fellBack, setFellBack] = useState(false);
  const [requestedAreaCode, setRequestedAreaCode] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(
    business.desiredPhoneNumber,
  );

  const [state, formAction, pending] = useActionState(saveNumberStep, INITIAL);
  const [navPending, startNav] = useTransition();

  async function searchNumbers(ac: string) {
    setLoading(true);
    setSearchError(null);
    try {
      const url = new URL(
        "/api/onboard/available-numbers",
        window.location.origin,
      );
      if (ac) url.searchParams.set("areaCode", ac);
      const res = await fetch(url.toString(), { cache: "no-store" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(body.message ?? `Search failed (${res.status})`);
      }
      const data = (await res.json()) as NumbersResponse;
      setNumbers(data.numbers);
      setFellBack(data.fellBack);
      setRequestedAreaCode(data.requestedAreaCode);
      // If the previously selected number isn't in the new results, clear
      // it so the Continue button doesn't proceed with a stale choice.
      if (selected && !data.numbers.some((n) => n.phoneNumber === selected)) {
        setSelected(null);
      }
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : String(err));
      setNumbers([]);
    } finally {
      setLoading(false);
    }
  }

  // Auto-search on first load with the default area code.
  useEffect(() => {
    searchNumbers(defaultAreaCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    searchNumbers(areaCode);
  }

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold">Pick your phone number</h1>
      <p className="text-sm text-muted-foreground mb-4">
        This is the number your customers will call. We&apos;ll buy it from
        Twilio and wire it to your AI assistant after checkout. Pick a local
        area code so callers see a familiar number.
      </p>

      <form onSubmit={handleSearch} className="flex items-end gap-2 mb-3">
        <div className="grid gap-1.5 flex-1 max-w-[180px]">
          <Label htmlFor="areaCode">Area code</Label>
          <Input
            id="areaCode"
            inputMode="numeric"
            maxLength={3}
            pattern="[2-9][0-9]{2}"
            placeholder="512"
            value={areaCode}
            onChange={(e) => setAreaCode(e.target.value.replace(/[^0-9]/g, ""))}
          />
        </div>
        <Button type="submit" variant="outline" disabled={loading}>
          <Search size={14} className="mr-1.5" />
          {loading ? "Searching…" : "Search"}
        </Button>
      </form>

      {fellBack && requestedAreaCode && (
        <div className="text-xs text-muted-foreground bg-muted/40 border rounded-md px-3 py-2 mb-2">
          No numbers available in area code {requestedAreaCode} right now —
          showing other available US local numbers.
        </div>
      )}

      {searchError && (
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2 mb-2">
          {searchError}
        </div>
      )}

      <form action={(fd) => startNav(() => formAction(fd))}>
        <input
          type="hidden"
          name="phoneNumber"
          value={selected ?? ""}
          readOnly
        />

        <div className="flex flex-col gap-2 mb-4">
          {numbers.length === 0 && !loading && !searchError && (
            <p className="text-sm text-muted-foreground">No numbers found.</p>
          )}
          {numbers.map((n) => {
            const isSelected = selected === n.phoneNumber;
            return (
              <button
                key={n.phoneNumber}
                type="button"
                onClick={() => setSelected(n.phoneNumber)}
                className={`flex items-center justify-between rounded-md border p-3 text-left transition-colors ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "hover:bg-accent"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Phone
                    size={16}
                    className={
                      isSelected ? "text-primary" : "text-muted-foreground"
                    }
                  />
                  <div>
                    <div className="text-sm font-medium font-mono">
                      {formatPhone(n.phoneNumber)}
                    </div>
                    {(n.locality || n.region) && (
                      <div className="text-xs text-muted-foreground">
                        {[n.locality, n.region].filter(Boolean).join(", ")}
                      </div>
                    )}
                  </div>
                </div>
                {isSelected && (
                  <span className="text-xs font-medium text-primary">
                    Selected
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {state.error && (
          <p className="text-sm text-destructive mb-2">{state.error}</p>
        )}

        <div className="flex justify-between pt-2">
          <Button asChild variant="ghost">
            <a href="/onboard/calendar">Back</a>
          </Button>
          <Button
            type="submit"
            disabled={!selected || pending || navPending || loading}
          >
            {pending || navPending ? "Saving…" : "Continue"}
          </Button>
        </div>
      </form>
    </div>
  );
}
