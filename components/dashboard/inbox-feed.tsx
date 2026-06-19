"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Check,
  ChevronDown,
  Inbox as InboxIcon,
  MessageSquareText,
  PhoneCall,
  Voicemail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { setOwnerMessageStatus } from "@/app/dashboard/inbox/actions";
import { formatPhone, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { InboxItem } from "@/lib/db/queries";

export function InboxFeed({
  items,
  timezone,
}: {
  items: InboxItem[];
  timezone: string;
}) {
  void timezone;
  return (
    <ul className="flex flex-col divide-y rounded-md border bg-card">
      {items.map((item) => (
        <li key={item.key}>
          <InboxRow item={item} />
        </li>
      ))}
    </ul>
  );
}

function InboxRow({ item }: { item: InboxItem }) {
  switch (item.kind) {
    case "call":
      return <CallRow item={item} />;
    case "sms":
      return <SmsRow item={item} />;
    case "message":
      return <MessageRow item={item} />;
  }
}

function CallRow({
  item,
}: {
  item: Extract<InboxItem, { kind: "call" }>;
}) {
  return (
    <Link
      href={`/dashboard/calls/${item.callId}`}
      className="flex items-start gap-3 p-4 hover:bg-accent/40 transition-colors"
    >
      <IconBubble icon={PhoneCall} tone={item.isEmergency ? "red" : "default"} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-3">
          <div className="font-medium text-sm truncate flex items-center gap-2">
            {item.contactName ??
              (item.contactPhone ? formatPhone(item.contactPhone) : "Unknown caller")}
            {item.status === "in_progress" && <LivePill />}
            {item.isEmergency && <span className="text-xs text-red-600 font-medium">emergency</span>}
          </div>
          <div className="text-xs text-muted-foreground shrink-0">
            {formatRelative(item.at)}
          </div>
        </div>
        {item.contactName && item.contactPhone && (
          <div className="text-xs text-muted-foreground mt-0.5">
            {formatPhone(item.contactPhone)}
          </div>
        )}
        {item.summary && (
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
            {item.summary}
          </p>
        )}
      </div>
    </Link>
  );
}

function SmsRow({
  item,
}: {
  item: Extract<InboxItem, { kind: "sms" }>;
}) {
  const href = item.contactId
    ? `/dashboard/messages/${item.contactId}`
    : "/dashboard/messages";
  return (
    <Link
      href={href}
      className="flex items-start gap-3 p-4 hover:bg-accent/40 transition-colors"
    >
      <IconBubble
        icon={MessageSquareText}
        tone={item.needsReply ? "amber" : "default"}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-3">
          <div className="font-medium text-sm truncate flex items-center gap-2">
            {item.contactName ??
              (item.contactPhone ? formatPhone(item.contactPhone) : "Unknown")}
            {item.needsReply && (
              <span className="text-xs text-amber-600 font-medium">
                needs reply
              </span>
            )}
            {item.flagged && (
              <AlertCircle size={12} className="text-primary shrink-0" />
            )}
          </div>
          <div className="text-xs text-muted-foreground shrink-0">
            {formatRelative(item.at)}
          </div>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
          {item.lastSender === "owner" && (
            <span className="text-[10px] uppercase tracking-wider mr-1 text-foreground/60">
              you ·
            </span>
          )}
          {item.lastSender === "ai" && (
            <span className="text-[10px] uppercase tracking-wider mr-1 text-foreground/60">
              ai ·
            </span>
          )}
          {item.lastBody}
        </p>
      </div>
    </Link>
  );
}

function MessageRow({
  item,
}: {
  item: Extract<InboxItem, { kind: "message" }>;
}) {
  const [expanded, setExpanded] = useState(item.status === "new");
  const [pending, startTransition] = useTransition();
  const isNew = item.status === "new";

  const ack = () => {
    startTransition(() => {
      void setOwnerMessageStatus(item.ownerMessageId, "acknowledged");
    });
  };

  return (
    <div
      className={cn(
        "p-4 flex flex-col gap-3 transition-colors",
        isNew && "bg-amber-50/40 dark:bg-amber-950/10",
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-start gap-3 text-left w-full"
      >
        <IconBubble icon={Voicemail} tone={isNew ? "amber" : "default"} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-3">
            <div className="font-medium text-sm truncate flex items-center gap-2">
              {item.callerName ??
                (item.callerPhone ? formatPhone(item.callerPhone) : "Caller")}
              {isNew && (
                <span className="text-xs text-amber-600 font-medium">
                  new message
                </span>
              )}
              {item.status === "acknowledged" && (
                <span className="text-xs text-muted-foreground">
                  acknowledged
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
              {formatRelative(item.at)}
              <ChevronDown
                size={14}
                className={cn(
                  "transition-transform",
                  expanded && "rotate-180",
                )}
              />
            </div>
          </div>
          {item.subject ? (
            <div className="text-xs text-muted-foreground mt-0.5">
              {item.subject}
            </div>
          ) : null}
          {!expanded && (
            <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
              {item.message}
            </p>
          )}
        </div>
      </button>

      {expanded && (
        <div className="pl-13 ml-10 flex flex-col gap-3">
          <div className="text-sm whitespace-pre-wrap leading-relaxed">
            {item.message}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {item.callerPhone && (
              <a
                href={`tel:${item.callerPhone}`}
                className="inline-flex items-center gap-1.5 text-sm rounded-md border px-3 py-1.5 hover:bg-accent transition-colors"
              >
                <PhoneCall size={14} /> Call {formatPhone(item.callerPhone)}
              </a>
            )}
            {item.callId && (
              <Link
                href={`/dashboard/calls/${item.callId}`}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
              >
                View original call
              </Link>
            )}
            {isNew && (
              <Button size="sm" onClick={ack} disabled={pending}>
                <Check size={14} className="mr-1.5" />
                {pending ? "Marking…" : "Mark acknowledged"}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function IconBubble({
  icon: Icon,
  tone = "default",
}: {
  icon: typeof InboxIcon;
  tone?: "default" | "red" | "amber";
}) {
  const toneClass =
    tone === "red"
      ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
      : tone === "amber"
        ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
        : "bg-muted text-muted-foreground";
  return (
    <div
      className={cn(
        "h-9 w-9 rounded-full flex items-center justify-center shrink-0",
        toneClass,
      )}
    >
      <Icon size={16} />
    </div>
  );
}

function LivePill() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 text-[10px] uppercase tracking-wider font-medium px-1.5 py-0.5">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
      live
    </span>
  );
}
