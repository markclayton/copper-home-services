import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertCircle, ArrowLeft, Pause } from "lucide-react";
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
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <Link
          href="/dashboard/messages"
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          <ArrowLeft size={14} /> All conversations
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold truncate">
            {contact.name ?? "Unknown"}
          </h1>
          <p className="text-sm text-muted-foreground font-mono">
            {formatPhone(contact.phone)}
          </p>
          {contact.aiPaused && (
            <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground font-medium mt-2">
              <Pause size={11} /> AI paused for this contact
            </div>
          )}
        </div>
        <PauseAiToggle contactId={contact.id} paused={contact.aiPaused} />
      </div>

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

      <div className="flex flex-col gap-3">
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

      <div className="pt-2">
        <ReplyComposer contactId={contact.id} aiPaused={contact.aiPaused} />
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
