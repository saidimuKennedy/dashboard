import { ModulePageClient } from "@/components/dashboard/module-page-client";

export default function RevenuePage() {
  return (
    <ModulePageClient
      title="Revenue"
      description="MRR, ARR, transactions, and revenue forecasting."
      ctaLabel="Record Revenue"
      endpoint="/api/v1/revenue"
      columns={["Description", "Type", "Amount", "Date"]}
      emptyTitle="No revenue entries"
      emptyDescription="Start tracking revenue to monitor business health."
    />
  );
}
