"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { AiPanel } from "@/components/layout/ai-panel";

export function DashboardChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideAiPanel = pathname.startsWith("/ai");

  return (
    <div className="flex min-h-0 flex-1">
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
      {hideAiPanel ? null : <AiPanel />}
    </div>
  );
}

export function DashboardChromeBoundary({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-0 flex-1">
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      }
    >
      <DashboardChrome>{children}</DashboardChrome>
    </Suspense>
  );
}
