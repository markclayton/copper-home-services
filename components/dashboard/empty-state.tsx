import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed py-12 px-6 flex flex-col items-center text-center gap-3">
      <div className="size-12 rounded-full bg-accent grid place-items-center text-accent-foreground">
        <Icon size={20} />
      </div>
      <div className="font-medium">{title}</div>
      <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
        {description}
      </p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
