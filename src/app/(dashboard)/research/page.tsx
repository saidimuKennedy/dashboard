import { Suspense } from "react";
import { ResearchPageClient } from "@/components/research/research-page-client";
import { Skeleton } from "@/components/ui/skeleton";

export default function ResearchPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full" />
        </div>
      }
    >
      <ResearchPageClient />
    </Suspense>
  );
}
