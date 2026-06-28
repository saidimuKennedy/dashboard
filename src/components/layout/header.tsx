"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, LogOut, Menu, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDashboardLayout } from "@/components/layout/dashboard-layout-context";
import type { SessionUser } from "@/lib/auth/session";

const routeLabels: Record<string, string> = {
  dashboard: "Dashboard",
  knowledge: "Knowledge",
  research: "Research",
  journal: "Journal",
  meetings: "Meetings",
  decisions: "Decisions",
  customers: "Customers",
  revenue: "Revenue",
  products: "Products",
  compliance: "Compliance",
  risks: "Risks",
  analytics: "Analytics",
  ai: "AI",
  settings: "Settings",
};

interface HeaderProps {
  user: SessionUser;
}

export function Header({ user }: HeaderProps) {
  const pathname = usePathname();
  const { setMobileNavOpen, toggleAiPanel, aiPanelOpen } = useDashboardLayout();
  const hideAiToggle = pathname.startsWith("/ai");
  const segments = pathname.split("/").filter(Boolean);

  const breadcrumbs = segments.length === 0
    ? [{ label: "Dashboard", href: "/dashboard" }]
    : segments.map((seg, i) => ({
        label: routeLabels[seg] ?? seg.charAt(0).toUpperCase() + seg.slice(1),
        href: "/" + segments.slice(0, i + 1).join("/"),
      }));

  const currentPage = breadcrumbs[breadcrumbs.length - 1]?.label ?? "Dashboard";

  async function handleLogout() {
    await fetch("/api/v1/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 lg:hidden"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <nav aria-label="Breadcrumb" className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground lg:hidden">{currentPage}</p>
          <div className="hidden items-center gap-1 text-sm lg:flex">
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.href} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                {i === breadcrumbs.length - 1 ? (
                  <span className="font-medium text-foreground">{crumb.label}</span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {crumb.label}
                  </Link>
                )}
              </span>
            ))}
          </div>
        </nav>
      </div>
      <div className="flex shrink-0 items-center gap-1 sm:gap-3">
        {!hideAiToggle ? (
          <Button
            variant={aiPanelOpen ? "secondary" : "ghost"}
            size="icon"
            className="lg:hidden"
            onClick={toggleAiPanel}
            aria-label={aiPanelOpen ? "Close AI assistant" : "Open AI assistant"}
            title="AI Assistant"
          >
            <Sparkles className="h-4 w-4" />
          </Button>
        ) : null}
        <div className="hidden items-center gap-2 sm:flex">
          <div className="flex h-8 w-8 items-center justify-center bg-primary/15">
            <User className="h-4 w-4 text-primary" />
          </div>
          <div className="text-right">
            <p className="text-sm font-medium leading-none">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-muted-foreground">{user.role}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={handleLogout} title="Sign out">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
