import { Suspense } from "react";
import { MeetingsPageClient } from "@/components/meetings/meetings-page-client";
import { Skeleton } from "@/components/ui/skeleton";

export default function MeetingsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full" />
        </div>
      }
    >
      <MeetingsPageClient />
    </Suspense>
  );
}
