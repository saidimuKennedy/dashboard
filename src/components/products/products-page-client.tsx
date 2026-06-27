"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ModulePageClient } from "@/components/dashboard/module-page-client";
import { ProductDetailModal } from "@/components/products/product-detail-modal";
import { productsCreateFields } from "@/config/module-create-fields";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

function renderProductRow(
  item: Record<string, unknown>,
  { onRowClick }: { onRowClick?: () => void }
) {
  const updated = item.updatedAt
    ? new Date(String(item.updatedAt)).toLocaleDateString()
    : "—";
  const releases = item.releases as unknown[] | undefined;
  const releaseLabel = releases?.length ? `${releases.length} release${releases.length === 1 ? "" : "s"}` : "—";

  return (
    <TableRow
      key={String(item.id)}
      className={cn(onRowClick && "cursor-pointer")}
      onClick={onRowClick}
    >
      <TableCell className="font-medium">{String(item.name ?? "—")}</TableCell>
      <TableCell>
        {item.status ? <Badge variant="secondary">{String(item.status)}</Badge> : "—"}
      </TableCell>
      <TableCell className="text-muted-foreground">{updated}</TableCell>
      <TableCell className="text-muted-foreground">{releaseLabel}</TableCell>
    </TableRow>
  );
}

export function ProductsPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const openId = searchParams.get("open");
    if (openId) setSelectedId(openId);
  }, [searchParams]);

  return (
    <>
      <ModulePageClient
        title="Products"
        description="Product catalog, features, and customer adoption."
        ctaLabel="Add Product"
        endpoint="/api/v1/products"
        columns={["Name", "Status", "Updated", "Releases"]}
        emptyTitle="No products"
        emptyDescription="Define your product portfolio and track adoption."
        createFields={productsCreateFields}
        renderRow={renderProductRow}
        onRowClick={(item) => setSelectedId(String(item.id))}
      />
      <ProductDetailModal
        productId={selectedId}
        onClose={() => {
          setSelectedId(null);
          router.replace("/products");
        }}
      />
    </>
  );
}
