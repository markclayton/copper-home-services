export function formatDateTime(d: Date | string | null, tz: string): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(typeof d === "string" ? new Date(d) : d);
}

export function formatDate(d: Date | string | null, tz: string): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(typeof d === "string" ? new Date(d) : d);
}

export function formatTime(d: Date | string | null, tz: string): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(typeof d === "string" ? new Date(d) : d);
}

export function formatRelative(d: Date | string | null): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export function formatDuration(seconds: number | null): string {
  if (seconds == null) return "—";
  if (seconds < 60) return `${seconds}s`;
  const min = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return `${min}m ${rem.toString().padStart(2, "0")}s`;
}

export function formatPhone(phone: string | null): string {
  if (!phone) return "—";
  const digits = phone.replace(/[^0-9]/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

/**
 * Normalize a US/Canada phone number to E.164 format (+15551234567).
 * Accepts: "(555) 123-4567", "555-123-4567", "5551234567", "15551234567",
 * "+1 555 123 4567", etc. Returns null if the input doesn't parse as a valid
 * NANP number (10 digits, area code + exchange both starting with 2-9).
 */
export function normalizeUsPhone(
  input: string | null | undefined,
): string | null {
  if (!input) return null;
  const digits = input.replace(/[^0-9]/g, "");
  let national: string;
  if (digits.length === 10) national = digits;
  else if (digits.length === 11 && digits.startsWith("1"))
    national = digits.slice(1);
  else return null;

  // NANP rules: area code (first digit) and exchange (fourth digit) can't
  // start with 0 or 1. Rules out "0001234567", "1112223333", etc.
  if (national[0] === "0" || national[0] === "1") return null;
  if (national[3] === "0" || national[3] === "1") return null;

  return `+1${national}`;
}

export function isValidUsPhone(
  input: string | null | undefined,
): boolean {
  return normalizeUsPhone(input) !== null;
}
