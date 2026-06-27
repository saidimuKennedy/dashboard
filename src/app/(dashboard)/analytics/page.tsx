import { ModulePageClient } from "@/components/dashboard/module-page-client";

export default function AnalyticsPage() {
  return (
    <ModulePageClient
      title="Analytics"
      description="Business metrics, charts, comparisons, and AI explanations."
      ctaLabel="Create Report"
      endpoint="/api/v1/analytics"
      columns={["Metric", "Period", "Value", "Change"]}
      emptyTitle="No analytics data"
      emptyDescription="Analytics populate automatically as you add customers, revenue, and other records."
      createEnabled={false}
    />
  );
}
