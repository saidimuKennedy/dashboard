import { ModulePageClient } from "@/components/dashboard/module-page-client";
import { customersCreateFields } from "@/config/module-create-fields";

export default function CustomersPage() {
  return (
    <ModulePageClient
      title="Customers"
      description="Customer relationships, timelines, and AI insights."
      ctaLabel="Add Customer"
      endpoint="/api/v1/customers"
      columns={["Name", "Status", "Updated", "Company"]}
      emptyTitle="No customers"
      emptyDescription="Add your first customer to start tracking relationships."
      createFields={customersCreateFields}
    />
  );
}
