import { Inbox } from "lucide-react";
import { EmptyState } from "@/components/dashboard/empty-state";
import { InboxFeed } from "@/components/dashboard/inbox-feed";
import { getInboxItems, requireBusiness } from "@/lib/db/queries";

export default async function InboxPage() {
  const { business } = await requireBusiness();
  const items = await getInboxItems(business.id, 50);

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold">Inbox</h1>
        <p className="text-sm text-muted-foreground">
          Everything that needs your attention — calls, texts, and messages
          the AI took for you — in one place.
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="All caught up"
          description="New calls, texts, and messages will land here the moment they happen."
        />
      ) : (
        <InboxFeed items={items} timezone={business.timezone} />
      )}
    </div>
  );
}
