"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ModulePageClient } from "@/components/dashboard/module-page-client";
import { RiskDetailModal } from "@/components/risks/risk-detail-modal";
import { risksCreateFields } from "@/config/module-create-fields";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { RISK_CATEGORY_LABELS, RISK_LEVEL_LABELS } from "@/types/risk";

function renderRiskRow(
  item: Record<string, unknown>,
  { onRowClick }: { onRowClick?: () => void }
) {
  const level = item.level ? String(item.level) : null;
  const updated = item.updatedAt
    ? new Date(String(item.updatedAt)).toLocaleDateString()
    : "—";
  const category = item.category ? String(item.category) : null;

  return (
    <TableRow
      key={String(item.id)}
      className={cn(onRowClick && "cursor-pointer")}
      onClick={onRowClick}
    >
      <TableCell className="max-w-md font-medium">
        <span className="line-clamp-2">{String(item.title ?? "—")}</span>
      </TableCell>
      <TableCell>
        {level ? (
          <Badge variant="secondary">
            {RISK_LEVEL_LABELS[level as keyof typeof RISK_LEVEL_LABELS] ?? level}
          </Badge>
        ) : (
          "—"
        )}
      </TableCell>
      <TableCell className="text-muted-foreground">{updated}</TableCell>
      <TableCell className="text-muted-foreground">
        {category
          ? RISK_CATEGORY_LABELS[category as keyof typeof RISK_CATEGORY_LABELS] ?? category
          : "—"}
      </TableCell>
    </TableRow>
  );
}

export function RisksPageClient() {
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
        title="Risks"
        description="Risk register with severity, likelihood, and mitigation plans."
        ctaLabel="Add Risk"
        endpoint="/api/v1/risks"
        columns={["Risk", "Level", "Updated", "Category"]}
        emptyTitle="No risks identified"
        emptyDescription="Document risks to maintain visibility and mitigation plans."
        createFields={risksCreateFields}
        renderRow={renderRiskRow}
        onRowClick={(item) => setSelectedId(String(item.id))}
      />
      <RiskDetailModal
        riskId={selectedId}
        onClose={() => {
          setSelectedId(null);
          router.replace("/risks");
        }}
      />
    </>
  );
}
