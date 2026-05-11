import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertCircle, ArrowLeft } from "lucide-react";
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

      <div>
        <h1 className="text-2xl font-semibold">{contact.name ?? "Unknown"}</h1>
        <p className="text-sm text-muted-foreground font-mono">
          {formatPhone(contact.phone)}
        </p>
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
              body={m.body}
              at={m.sentAt ?? m.createdAt}
              timezone={business.timezone}
            />
          ))
        )}
      </div>
    </div>
  );
}

function MessageBubble({
  direction,
  body,
  at,
  timezone,
}: {
  direction: "inbound" | "outbound";
  body: string;
  at: Date;
  timezone: string;
}) {
  const isInbound = direction === "inbound";
  return (
    <div className={`flex ${isInbound ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
          isInbound
            ? "bg-muted text-foreground rounded-bl-sm"
            : "bg-primary text-primary-foreground rounded-br-sm"
        }`}
      >
        <div className="text-sm whitespace-pre-wrap leading-relaxed">
          {body}
        </div>
        <div
          className={`text-[10px] mt-1.5 ${
            isInbound ? "text-muted-foreground" : "text-primary-foreground/70"
          }`}
        >
          {formatDateTime(at, timezone)}
        </div>
      </div>
    </div>
  );
}
