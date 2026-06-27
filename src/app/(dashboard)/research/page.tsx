import { ModulePageClient } from "@/components/dashboard/module-page-client";
import { researchCreateFields } from "@/config/module-create-fields";

export default function ResearchPage() {
  return (
    <ModulePageClient
      title="Research"
      description="Track market research, competitive analysis, and product discovery."
      ctaLabel="New Research Topic"
      endpoint="/api/v1/research"
      columns={["Title", "Stage", "Updated", "Author"]}
      emptyTitle="No research topics"
      emptyDescription="Start tracking research to inform product and market decisions."
      createFields={researchCreateFields}
    />
  );
}
