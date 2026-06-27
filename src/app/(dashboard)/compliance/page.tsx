import { ModulePageClient } from "@/components/dashboard/module-page-client";
import { complianceCreateFields } from "@/config/module-create-fields";

export default function CompliancePage() {
  return (
    <ModulePageClient
      title="Compliance"
      description="Regulatory requirements, audits, and compliance scoring."
      ctaLabel="Add Requirement"
      endpoint="/api/v1/compliance"
      columns={["Requirement", "Status", "Due Date", "Owner"]}
      emptyTitle="No compliance items"
      emptyDescription="Track regulatory requirements and maintain compliance posture."
      createFields={complianceCreateFields}
    />
  );
}
