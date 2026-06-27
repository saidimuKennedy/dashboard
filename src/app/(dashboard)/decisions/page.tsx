import { Suspense } from "react";
import { DecisionsPageClient } from "@/components/decisions/decisions-page-client";

export default function DecisionsPage() {
  return (
    <Suspense fallback={null}>
      <DecisionsPageClient />
    </Suspense>
  );
}
