import { Suspense } from "react";
import { KnowledgePageClient } from "@/components/knowledge/knowledge-page-client";
import { Skeleton } from "@/components/ui/skeleton";

export default function KnowledgePage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full" />
        </div>
      }
    >
      <KnowledgePageClient />
    </Suspense>
  );
}
