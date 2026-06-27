import { Suspense } from "react";
import { AiHub } from "@/components/ai/ai-hub";
import { Skeleton } from "@/components/ui/skeleton";

export default function AiPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-[70vh] w-full" />
        </div>
      }
    >
      <AiHub />
    </Suspense>
  );
}
