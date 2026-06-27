import { ModulePageClient } from "@/components/dashboard/module-page-client";
import { productsCreateFields } from "@/config/module-create-fields";

export default function ProductsPage() {
  return (
    <ModulePageClient
      title="Products"
      description="Product catalog, features, and customer adoption."
      ctaLabel="Add Product"
      endpoint="/api/v1/products"
      columns={["Name", "Status", "Updated", "Category"]}
      emptyTitle="No products"
      emptyDescription="Define your product portfolio and track adoption."
      createFields={productsCreateFields}
    />
  );
}
