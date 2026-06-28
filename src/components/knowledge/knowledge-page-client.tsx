"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ModulePageClient } from "@/components/dashboard/module-page-client";
import { KnowledgeDetailModal } from "@/components/knowledge/knowledge-detail-modal";
import { knowledgeCreateFields } from "@/config/module-create-fields";

export function KnowledgePageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const openId = searchParams.get("open");
    if (openId) setSelectedId(openId);
  }, [searchParams]);

  return (
    <>
      <ModulePageClient
        title="Knowledge"
        description="Central repository of business knowledge, documentation, and insights."
        ctaLabel="Add Article"
        endpoint="/api/v1/knowledge"
        columns={["Title", "Status", "Updated", "Author"]}
        emptyTitle="No knowledge articles"
        emptyDescription="Document decisions, processes, and institutional knowledge for your team."
        createFields={knowledgeCreateFields}
        onRowClick={(item) => setSelectedId(String(item.id))}
      />
      <KnowledgeDetailModal
        articleId={selectedId}
        onClose={() => {
          setSelectedId(null);
          router.replace("/knowledge");
        }}
        onOpenArticle={setSelectedId}
      />
    </>
  );
}
