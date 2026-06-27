"use client";

import { useEffect, useState } from "react";
import { ModulePage } from "@/components/dashboard/module-page";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface ModulePageClientProps {
  title: string;
  description: string;
  ctaLabel: string;
  endpoint: string;
  columns: string[];
  emptyTitle: string;
  emptyDescription: string;
  renderRow?: (item: Record<string, unknown>) => React.ReactNode;
}

export function ModulePageClient({
  title,
  description,
  ctaLabel,
  endpoint,
  columns,
  emptyTitle,
  emptyDescription,
  renderRow,
}: ModulePageClientProps) {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(endpoint)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          const data = json.data?.items ?? json.data ?? [];
          setItems(Array.isArray(data) ? data : []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [endpoint]);

  const defaultRenderRow = (item: Record<string, unknown>) => (
    <TableRow key={String(item.id)}>
      <TableCell className="font-medium">{String(item.title ?? item.name ?? "—")}</TableCell>
      <TableCell>
        {item.status ? (
          <Badge variant="secondary">{String(item.status)}</Badge>
        ) : (
          "—"
        )}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {item.updatedAt
          ? new Date(String(item.updatedAt)).toLocaleDateString()
          : item.createdAt
            ? new Date(String(item.createdAt)).toLocaleDateString()
            : "—"}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {String(
          (item.author as { firstName?: string })?.firstName ??
            item.owner ??
            "—"
        )}
      </TableCell>
    </TableRow>
  );

  if (!loading && items.length > 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((col) => (
                  <TableHead key={col}>{col}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) =>
                renderRow ? renderRow(item) : defaultRenderRow(item)
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  return (
    <ModulePage
      title={title}
      description={description}
      ctaLabel={ctaLabel}
      loading={loading}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
      columns={columns}
    />
  );
}
