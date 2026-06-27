"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { RevenueCharts } from "@/components/revenue/RevenueCharts";
import { RevenueExecutiveSummary } from "@/components/revenue/RevenueExecutiveSummary";
import { RevenueForecastPanel } from "@/components/revenue/RevenueForecastPanel";
import { RevenueIntelligenceBreakdown } from "@/components/revenue/RevenueIntelligenceBreakdown";
import { RevenueLedgerTable } from "@/components/revenue/RevenueLedgerTable";
import { RevenueManagePanel } from "@/components/revenue/RevenueManagePanel";
import { RevenuePerformanceTables } from "@/components/revenue/RevenuePerformanceTables";
import type { RevenueCenterSnapshot } from "@/lib/finance/reports";

type CenterPayload = {
  snapshot: RevenueCenterSnapshot;
  breakdown: {
    byIndustry: { label: string; amount: number }[];
    bySource: { label: string; amount: number }[];
  };
  formOptions: {
    customers: { id: string; displayAlias: string }[];
    products: { id: string; name: string }[];
    contracts: { id: string; label: string }[];
  };
  canRevealPii: boolean;
  canWrite: boolean;
};

export function RevenuePageClient() {
  const [data, setData] = useState<CenterPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCenter = useCallback(() => {
    setLoading(true);
    fetch("/api/v1/revenue/center")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setData(json.data);
        else toast.error(json.message ?? "Failed to load revenue data.");
      })
      .catch(() => toast.error("Failed to load revenue data."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchCenter();
  }, [fetchCenter]);

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Revenue</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Services revenue intelligence — MRR, forecasting, and ledger.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight">Revenue</h1>
        <p className="text-sm text-muted-foreground">Unable to load revenue center.</p>
      </div>
    );
  }

  const { snapshot, breakdown, formOptions, canRevealPii, canWrite } = data;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Revenue</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Services revenue intelligence — POS, WA, JChats, CRM, and implementations. Customer
          identities use aliases in this view; sensitive fields require founder or admin access.
        </p>
      </div>

      <section aria-label="Executive summary">
        <RevenueExecutiveSummary executive={snapshot.executive} highlights={snapshot.highlights} />
      </section>

      <section aria-label="Financial intelligence" className="space-y-4">
        <RevenueCharts
          trend={snapshot.trend}
          bySource={snapshot.bySource}
          revenueVsExpenses={snapshot.revenueVsExpenses}
        />
        <RevenueIntelligenceBreakdown
          byIndustry={breakdown.byIndustry}
          bySource={breakdown.bySource}
        />
      </section>

      <section aria-label="Performance">
        <RevenuePerformanceTables
          topAccounts={snapshot.topAccounts}
          topProducts={snapshot.topProducts}
        />
      </section>

      <section aria-label="Forecasting">
        <RevenueForecastPanel forecast={snapshot.forecast} />
      </section>

      <section aria-label="Revenue ledger">
        <RevenueLedgerTable rows={snapshot.ledger} />
      </section>

      {canWrite && (
        <section aria-label="Capture data">
          <h2 className="mb-3 text-sm font-semibold">Record data</h2>
          <RevenueManagePanel
            accounts={formOptions.customers}
            products={formOptions.products}
            contracts={formOptions.contracts}
            canManagePii={canRevealPii}
            onSaved={fetchCenter}
          />
        </section>
      )}
    </div>
  );
}
