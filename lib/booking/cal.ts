/**
 * Cal.com v2 API client — narrow surface for slot lookup + booking creation.
 * Docs: https://cal.com/docs/api-reference/v2
 */

import { requireEnv } from "@/lib/env";

const CAL_API_BASE = "https://api.cal.com/v2";

type CalRequestInit = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  apiVersion: string;
  body?: unknown;
  searchParams?: Record<string, string | number | undefined>;
};

async function calFetch<T>(
  path: string,
  opts: CalRequestInit,
): Promise<T> {
  const apiKey = requireEnv("CAL_COM_API_KEY");
  const url = new URL(`${CAL_API_BASE}${path}`);
  if (opts.searchParams) {
    for (const [k, v] of Object.entries(opts.searchParams)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }

  const res = await fetch(url, {
    method: opts.method ?? "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "cal-api-version": opts.apiVersion,
      "Content-Type": "application/json",
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cal.com ${opts.method ?? "GET"} ${path} ${res.status}: ${text}`);
  }
  return (await res.json()) as T;
}

export type CalSlot = { time: string };

// Cal.com v2 has shipped both shapes for /slots responses across versions.
// We accept both: bare ISO strings or { time: "..." } objects.
type RawSlot = string | { time?: string; start?: string };
type SlotsResponse = {
  status: string;
  data: Record<string, RawSlot[]>;
};

export async function listAvailableSlots(args: {
  eventTypeId: number;
  startDate: string; // ISO date YYYY-MM-DD
  endDate: string;
  timeZone: string;
}): Promise<CalSlot[]> {
  const data = await calFetch<SlotsResponse>("/slots", {
    apiVersion: "2024-09-04",
    searchParams: {
      eventTypeId: args.eventTypeId,
      start: args.startDate,
      end: args.endDate,
      timeZone: args.timeZone,
    },
  });

  const flat: CalSlot[] = [];
  for (const slots of Object.values(data.data ?? {})) {
    for (const raw of slots) {
      const time =
        typeof raw === "string" ? raw : (raw.time ?? raw.start ?? null);
      if (time) flat.push({ time });
    }
  }
  return flat;
}

export type CreateBookingArgs = {
  eventTypeId: number;
  startISO: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone?: string;
  timeZone: string;
  notes?: string;
};

type CreateBookingResponse = {
  status: string;
  data: {
    id: number;
    uid: string;
    start: string;
    end: string;
    status: string;
    title?: string;
  };
};

export async function createBooking(args: CreateBookingArgs) {
  const body = {
    start: args.startISO,
    eventTypeId: args.eventTypeId,
    attendee: {
      name: args.attendeeName,
      email: args.attendeeEmail,
      timeZone: args.timeZone,
      phoneNumber: args.attendeePhone,
      language: "en",
    },
    bookingFieldsResponses: args.notes ? { notes: args.notes } : undefined,
  };

  const res = await calFetch<CreateBookingResponse>("/bookings", {
    method: "POST",
    apiVersion: "2024-08-13",
    body,
  });

  return res.data;
}

type CreateEventTypeResponse = {
  status: string;
  data: {
    id: number;
    title: string;
    slug: string;
    lengthInMinutes: number;
  };
};

export type CreateEventTypeArgs = {
  title: string;
  slug: string;
  lengthInMinutes?: number;
  description?: string;
};

/**
 * Create a Cal.com event type for a tenant. Used during provisioning so that
 * book_appointment has an event type to write to without manual setup.
 */
export async function createEventType(args: CreateEventTypeArgs) {
  const res = await calFetch<CreateEventTypeResponse>("/event-types", {
    method: "POST",
    apiVersion: "2024-06-14",
    body: {
      title: args.title,
      slug: args.slug,
      lengthInMinutes: args.lengthInMinutes ?? 60,
      description:
        args.description ??
        "Service visit booked through the AI receptionist.",
    },
  });
  return res.data;
}

/**
 * Delete a Cal.com event type. Used during tenant deprovisioning.
 * Docs: https://cal.com/docs/api-reference/v2/event-types/delete-an-event-type
 */
export async function deleteEventType(eventTypeId: number) {
  return calFetch<{ status: string }>(`/event-types/${eventTypeId}`, {
    method: "DELETE",
    apiVersion: "2024-06-14",
  });
}
