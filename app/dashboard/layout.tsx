import { Suspense } from "react";
import Link from "next/link";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { LogoutButton } from "@/components/logout-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { requireBusiness } from "@/lib/db/queries";

async function HeaderBusinessName() {
  const { business } = await requireBusiness();
  return (
    <span className="text-sm font-semibold">{business.name}</span>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="font-semibold">
              Copper
            </Link>
            <span className="text-muted-foreground">/</span>
            <Suspense fallback={<span className="text-sm text-muted-foreground">…</span>}>
              <HeaderBusinessName />
            </Suspense>
          </div>
          <div className="flex items-center gap-2">
            <ThemeSwitcher />
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="flex-1 grid grid-cols-[220px_1fr]">
        <aside className="border-r bg-muted/20">
          <DashboardSidebar />
        </aside>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
