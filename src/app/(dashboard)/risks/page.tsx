import { ModulePageClient } from "@/components/dashboard/module-page-client";
import { risksCreateFields } from "@/config/module-create-fields";

export default function RisksPage() {
  return (
    <ModulePageClient
      title="Risks"
      description="Risk register with severity, likelihood, and mitigation plans."
      ctaLabel="Add Risk"
      endpoint="/api/v1/risks"
      columns={["Risk", "Level", "Updated", "Owner"]}
      emptyTitle="No risks identified"
      emptyDescription="Document risks to maintain visibility and mitigation plans."
      createFields={risksCreateFields}
    />
  );
}
