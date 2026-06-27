"use client";

import { type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface ModulePageProps {
  title: string;
  description: string;
  ctaLabel: string;
  onCtaClick?: () => void;
  showCta?: boolean;
  icon?: LucideIcon;
  loading?: boolean;
  creating?: boolean;
  createForm?: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  columns?: string[];
}

export function ModulePage({
  title,
  description,
  ctaLabel,
  onCtaClick,
  showCta = true,
  loading,
  creating = false,
  createForm,
  emptyTitle = "No records yet",
  emptyDescription = "Get started by creating your first entry.",
  columns = ["Name", "Status", "Updated", "Owner"],
}: ModulePageProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {showCta && !creating ? <Button onClick={onCtaClick}>{ctaLabel}</Button> : null}
      </div>

      {loading ? (
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
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((col) => (
                    <TableCell key={col}>
                      <Skeleton className="h-4 w-full max-w-[120px]" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : creating && createForm ? (
        createForm
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-sm font-medium">{emptyTitle}</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">{emptyDescription}</p>
          {showCta ? (
            <Button className="mt-4" onClick={onCtaClick}>
              {ctaLabel}
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
