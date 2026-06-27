import { ModulePageClient } from "@/components/dashboard/module-page-client";
import { decisionsCreateFields } from "@/config/module-create-fields";

export default function DecisionsPage() {
  return (
    <ModulePageClient
      title="Decisions"
      description="Decision log with context, rationale, and outcomes."
      ctaLabel="Log Decision"
      endpoint="/api/v1/decisions"
      columns={["Decision", "Status", "Date", "Owner"]}
      emptyTitle="No decisions logged"
      emptyDescription="Record key decisions to build institutional memory."
      createFields={decisionsCreateFields}
    />
  );
}
