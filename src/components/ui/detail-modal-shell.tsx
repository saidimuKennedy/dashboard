"use client";

import { cn } from "@/lib/utils";

type DetailModalMaxWidth = "2xl" | "4xl" | "5xl";

const maxWidthClasses: Record<DetailModalMaxWidth, string> = {
  "2xl": "sm:max-w-2xl",
  "4xl": "sm:max-w-4xl",
  "5xl": "sm:max-w-5xl",
};

interface DetailModalShellProps {
  onClose: () => void;
  closeLabel?: string;
  maxWidth?: DetailModalMaxWidth;
  className?: string;
  children: React.ReactNode;
}

export function DetailModalShell({
  onClose,
  closeLabel = "Close details",
  maxWidth = "2xl",
  className,
  children,
}: DetailModalShellProps) {
  return (
    <div className="fixed inset-0 z-50 flex sm:items-center sm:justify-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
        aria-label={closeLabel}
      />
      <div
        className={cn(
          "relative z-10 flex h-full w-full flex-col overflow-hidden border-border bg-card shadow-2xl sm:h-auto sm:max-h-[90vh] sm:rounded-xl sm:border",
          maxWidthClasses[maxWidth],
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function detailModalHeaderClassName() {
  return "flex shrink-0 flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-6";
}

export function detailModalActionsClassName() {
  return "flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end";
}
