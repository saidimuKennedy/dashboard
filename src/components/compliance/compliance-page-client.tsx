"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ModulePageClient } from "@/components/dashboard/module-page-client";
import { ComplianceDetailModal } from "@/components/compliance/compliance-detail-modal";
import { complianceCreateFields } from "@/config/module-create-fields";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { COMPLIANCE_STATUS_LABELS } from "@/types/compliance";

function renderComplianceRow(
  item: Record<string, unknown>,
  { onRowClick }: { onRowClick?: () => void }
) {
  const status = item.status ? String(item.status) : null;
  const deadline = item.deadline
    ? new Date(String(item.deadline)).toLocaleDateString()
    : "—";

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
        {status ? (
          <Badge variant="secondary">
            {COMPLIANCE_STATUS_LABELS[status as keyof typeof COMPLIANCE_STATUS_LABELS] ?? status}
          </Badge>
        ) : (
          "—"
        )}
      </TableCell>
      <TableCell className="text-muted-foreground">{deadline}</TableCell>
      <TableCell className="text-muted-foreground">—</TableCell>
    </TableRow>
  );
}

export function CompliancePageClient() {
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
        title="Compliance"
        description="Regulatory requirements, audits, and compliance scoring."
        ctaLabel="Add Requirement"
        endpoint="/api/v1/compliance"
        columns={["Requirement", "Status", "Due Date", "Owner"]}
        emptyTitle="No compliance items"
        emptyDescription="Track regulatory requirements and maintain compliance posture."
        createFields={complianceCreateFields}
        renderRow={renderComplianceRow}
        onRowClick={(item) => setSelectedId(String(item.id))}
      />
      <ComplianceDetailModal
        itemId={selectedId}
        onClose={() => {
          setSelectedId(null);
          router.replace("/compliance");
        }}
      />
    </>
  );
}
