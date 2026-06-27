"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      theme="dark"
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            "group toast border border-border bg-card text-foreground shadow-lg !rounded-none",
          title: "text-sm font-medium",
          description: "text-sm text-muted-foreground",
          success: "border-success/40 [&_[data-icon]]:text-success",
          error: "border-destructive/40 [&_[data-icon]]:text-destructive",
        },
      }}
    />
  );
}
