"use client";

import { cn } from "@/lib/utils";

interface MobileRecordListProps<T> {
  items: T[];
  keyExtractor: (item: T) => string;
  onItemClick?: (item: T) => void;
  renderItem: (item: T) => React.ReactNode;
  className?: string;
}

export function MobileRecordList<T>({
  items,
  keyExtractor,
  onItemClick,
  renderItem,
  className,
}: MobileRecordListProps<T>) {
  return (
    <div className={cn("space-y-2 lg:hidden", className)}>
      {items.map((item) => {
        const content = renderItem(item);
        if (!onItemClick) {
          return (
            <div
              key={keyExtractor(item)}
              className="rounded-xl border border-border bg-card p-4"
            >
              {content}
            </div>
          );
        }

        return (
          <button
            key={keyExtractor(item)}
            type="button"
            onClick={() => onItemClick(item)}
            className="w-full rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/40"
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}

export function DesktopTableShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("hidden overflow-hidden rounded-xl border border-border lg:block", className)}>
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {action ? <div className="shrink-0 sm:self-start">{action}</div> : null}
    </div>
  );
}
