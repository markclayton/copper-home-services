import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertCircle, ArrowLeft, Pause } from "lucide-react";
import { ConversationScroll } from "@/components/dashboard/conversation-scroll";
import { PauseAiToggle } from "@/components/dashboard/pause-ai-toggle";
import { ReplyComposer } from "@/components/dashboard/reply-composer";
import { getConversation, requireBusiness } from "@/lib/db/queries";
import { formatDateTime, formatPhone, formatRelative } from "@/lib/format";

export default async function ConversationDetailPage({
  params,
}: {
  params: Promise<{ contactId: string }>;
}) {
  const { contactId } = await params;
  const { business } = await requireBusiness();
  const { contact, messages, flagReasons } = await getConversation(
    business.id,
    contactId,
  );

  if (!contact) notFound();

  return (
    // Chat-app layout: pinned to viewport, only the middle scrolls. Negative
    // margin cancels the parent <main> padding so the column fills the area
    // exactly. h-[calc(100dvh-3.5rem)] = viewport minus the dashboard header.
    <div className="flex flex-col h-[calc(100dvh-3.5rem)] -m-4 md:-m-6">
      {/* Pinned top: back link + contact info + pause toggle */}
      <div className="border-b px-4 md:px-6 py-3 shrink-0 bg-background">
        <Link
          href="/dashboard/messages"
          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-1.5"
        >
          <ArrowLeft size={12} /> All conversations
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-semibold truncate">
              {contact.name ?? "Unknown"}
            </h1>
            <p className="text-xs text-muted-foreground font-mono">
              {formatPhone(contact.phone)}
            </p>
            {contact.aiPaused && (
              <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium mt-1">
                <Pause size={10} /> AI paused
              </div>
            )}
          </div>
          <PauseAiToggle contactId={contact.id} paused={contact.aiPaused} />
        </div>
      </div>

      {/* Scrolling middle: flag callout (if any) + messages */}
      <ConversationScroll triggerKey={messages.length}>
        <div className="px-4 md:px-6 py-4 flex flex-col gap-3 max-w-3xl mx-auto w-full">
          {flagReasons.length > 0 && (
            <div className="rounded-md border border-primary/30 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <AlertCircle size={14} className="text-primary" />
                AI flagged this conversation for you
              </div>
              {flagReasons.slice(0, 3).map((f, i) => (
                <div key={i} className="text-sm">
                  <div className="text-muted-foreground text-xs mb-0.5">
                    {formatRelative(f.at)}
                  </div>
                  <div>{f.reason}</div>
                  {f.customerMessage && (
                    <div className="text-xs text-muted-foreground mt-1 italic">
                      Triggered by: &ldquo;{f.customerMessage}&rdquo;
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No messages in this conversation yet.
            </p>
          ) : (
            messages.map((m) => (
              <MessageBubble
                key={m.id}
                direction={m.direction}
                sender={m.sender}
                body={m.body}
                at={m.sentAt ?? m.createdAt}
                timezone={business.timezone}
              />
            ))
          )}
        </div>
      </ConversationScroll>

      {/* Pinned bottom: composer */}
      <div className="border-t px-4 md:px-6 py-3 shrink-0 bg-background">
        <div className="max-w-3xl mx-auto w-full">
          <ReplyComposer contactId={contact.id} aiPaused={contact.aiPaused} />
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  direction,
  sender,
  body,
  at,
  timezone,
}: {
  direction: "inbound" | "outbound";
  sender: "customer" | "ai" | "owner";
  body: string;
  at: Date;
  timezone: string;
}) {
  const isInbound = direction === "inbound";
  // Owner replies stand apart from AI replies — both are outbound but visually
  // distinct so the owner can scan a thread and see which texts they sent
  // personally vs which the AI handled.
  const bubbleClasses = isInbound
    ? "bg-muted text-foreground rounded-bl-sm"
    : sender === "owner"
      ? "bg-foreground text-background rounded-br-sm"
      : "bg-primary text-primary-foreground rounded-br-sm";

  return (
    <div
      className={`flex flex-col ${isInbound ? "items-start" : "items-end"} gap-1`}
    >
      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${bubbleClasses}`}>
        <div className="text-sm whitespace-pre-wrap leading-relaxed">
          {body}
        </div>
        <div
          className={`text-[10px] mt-1.5 ${
            isInbound
              ? "text-muted-foreground"
              : sender === "owner"
                ? "text-background/70"
                : "text-primary-foreground/70"
          }`}
        >
          {formatDateTime(at, timezone)}
        </div>
      </div>
      {!isInbound && (
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium pr-2">
          {sender === "owner" ? "You" : "AI"}
        </div>
      )}
    </div>
  );
}
