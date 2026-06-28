"use client";

import type { SessionUser } from "@/lib/auth/session";
import {
  DashboardLayoutProvider,
  useDashboardLayout,
} from "@/components/layout/dashboard-layout-context";
import { Header } from "@/components/layout/header";
import { MobileSidebar, Sidebar } from "@/components/layout/sidebar";
import { DashboardChromeBoundary } from "@/components/layout/dashboard-chrome";

function DashboardShellInner({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const { mobileNavOpen, setMobileNavOpen } = useDashboardLayout();

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      <Sidebar />
      <MobileSidebar open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="relative flex min-w-0 flex-1 flex-col">
        <Header user={user} />
        <DashboardChromeBoundary>{children}</DashboardChromeBoundary>
      </div>
    </div>
  );
}

export function DashboardShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  return (
    <DashboardLayoutProvider>
      <DashboardShellInner user={user}>{children}</DashboardShellInner>
    </DashboardLayoutProvider>
  );
}
