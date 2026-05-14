import { Suspense } from "react";
import Link from "next/link";
import { LifeBuoy } from "lucide-react";
import { CopperLogo } from "@/components/copper-logo";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { LogoutButton } from "@/components/logout-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { requireBusiness } from "@/lib/db/queries";

async function HeaderBusinessName() {
  const { business } = await requireBusiness();
  return (
    <span className="text-sm font-semibold truncate max-w-[40vw] sm:max-w-none">
      {business.name}
    </span>
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
        <div className="flex h-14 items-center justify-between px-3 md:px-4 gap-2">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <MobileNav />
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 shrink-0"
            >
              <CopperLogo className="h-8 w-auto" priority />
              <span className="font-display text-lg tracking-tight">
                Copper
              </span>
            </Link>
            <span className="text-muted-foreground hidden sm:inline">/</span>
            <Suspense
              fallback={
                <span className="text-sm text-muted-foreground">…</span>
              }
            >
              <HeaderBusinessName />
            </Suspense>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <a
              href="mailto:info@joincopper.io"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-accent transition-colors"
            >
              <LifeBuoy size={14} /> Help
            </a>
            <a
              href="mailto:info@joincopper.io"
              aria-label="Help"
              className="sm:hidden inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-accent text-muted-foreground"
            >
              <LifeBuoy size={16} />
            </a>
            <ThemeSwitcher />
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="flex-1 grid grid-cols-1 md:grid-cols-[220px_1fr]">
        <aside className="hidden md:block border-r bg-muted/20">
          <DashboardSidebar />
        </aside>
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
