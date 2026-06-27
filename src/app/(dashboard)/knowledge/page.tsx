import { ModulePageClient } from "@/components/dashboard/module-page-client";

export default function KnowledgePage() {
  return (
    <ModulePageClient
      title="Knowledge"
      description="Central repository of business knowledge, documentation, and insights."
      ctaLabel="Add Article"
      endpoint="/api/v1/knowledge"
      columns={["Title", "Status", "Updated", "Author"]}
      emptyTitle="No knowledge articles"
      emptyDescription="Document decisions, processes, and institutional knowledge for your team."
    />
  );
}
