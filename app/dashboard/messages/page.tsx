import Link from "next/link";
import { AlertCircle, MessageSquareText, Pause } from "lucide-react";
import { EmptyState } from "@/components/dashboard/empty-state";
import { listConversations, requireBusiness } from "@/lib/db/queries";
import { formatPhone, formatRelative } from "@/lib/format";

export default async function MessagesPage() {
  const { business } = await requireBusiness();
  const conversations = await listConversations(business.id);

  const flaggedCount = conversations.filter((c) => c.flagged).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Messages</h1>
          <p className="text-sm text-muted-foreground">
            {conversations.length}{" "}
            {conversations.length === 1 ? "conversation" : "conversations"}
            {flaggedCount > 0 && (
              <>
                {" · "}
                <span className="text-primary font-medium">
                  {flaggedCount} need{flaggedCount === 1 ? "s" : ""} your
                  attention
                </span>
              </>
            )}
          </p>
        </div>
      </div>

      {conversations.length === 0 ? (
        <EmptyState
          icon={MessageSquareText}
          title="No conversations yet"
          description="Customers who text your AI number show up here, threaded by contact. The AI replies automatically and flags anything that needs you."
        />
      ) : (
        <div className="rounded-md border divide-y">
          {conversations.map((c) => (
            <ConversationRow key={c.key} c={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function ConversationRow({
  c,
}: {
  c: Awaited<ReturnType<typeof listConversations>>[number];
}) {
  const href = c.contactId ? `/dashboard/messages/${c.contactId}` : null;
  const inner = (
    <div className="flex items-start gap-3 px-4 py-3.5 hover:bg-accent/30 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <div className="font-medium text-sm truncate">
            {c.contactName ?? formatPhone(c.contactPhone)}
          </div>
          {c.contactName && c.contactPhone && (
            <div className="text-xs text-muted-foreground font-mono shrink-0">
              {formatPhone(c.contactPhone)}
            </div>
          )}
          {c.flagged && (
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
              <AlertCircle size={10} /> Needs you
            </span>
          )}
          {c.aiPaused && (
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              <Pause size={10} /> AI paused
            </span>
          )}
        </div>
        <div className="text-sm text-muted-foreground truncate">
          <span className="text-xs uppercase tracking-wider mr-1.5">
            {c.lastDirection === "inbound"
              ? "←"
              : c.lastSender === "owner"
                ? "→ You"
                : "→ AI"}
          </span>
          {c.lastBody}
        </div>
      </div>
      <div className="text-xs text-muted-foreground shrink-0 text-right pt-0.5">
        <div>{formatRelative(c.lastAt)}</div>
        <div className="mt-0.5">
          {c.messageCount} {c.messageCount === 1 ? "msg" : "msgs"}
        </div>
      </div>
    </div>
  );
  if (!href) return inner;
  return (
    <Link href={href} className="block">
      {inner}
    </Link>
  );
}
