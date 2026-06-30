"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ModulePageClient } from "@/components/dashboard/module-page-client";
import { JournalDetailModal } from "@/components/journal/journal-detail-modal";
import { journalCreateFields } from "@/config/module-create-fields";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { stripMarkdown } from "@/lib/ai/strip-markdown";
import { cn } from "@/lib/utils";

function renderJournalRow(
  item: Record<string, unknown>,
  { onRowClick }: { onRowClick?: () => void }
) {
  const date = item.date ? new Date(String(item.date)).toLocaleDateString() : "—";
  const updated = item.updatedAt
    ? new Date(String(item.updatedAt)).toLocaleDateString()
    : "—";
  const mood = item.mood ? String(item.mood) : "—";
  const author = (item.author as { firstName?: string })?.firstName ?? "—";
  const preview = stripMarkdown(String(item.aiSummary ?? item.content ?? "—"));
  const excerpt = preview.length > 100 ? `${preview.slice(0, 100)}…` : preview;

  return (
    <TableRow
      key={String(item.id)}
      className={cn(onRowClick && "cursor-pointer")}
      onClick={onRowClick}
    >
      <TableCell className="max-w-md font-medium">
        <span className="line-clamp-2">{excerpt}</span>
      </TableCell>
      <TableCell className="text-muted-foreground">{date}</TableCell>
      <TableCell>
        {item.mood ? <Badge variant="secondary">{mood}</Badge> : "—"}
      </TableCell>
      <TableCell className="text-muted-foreground">{updated}</TableCell>
      <TableCell className="text-muted-foreground">{author}</TableCell>
    </TableRow>
  );
}

export function JournalPageClient() {
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
        title="Founder Journal"
        description="Daily reflections, lessons learned, and strategic thinking."
        ctaLabel="New Entry"
        endpoint="/api/v1/journal"
        columns={["Entry", "Date", "Mood", "Updated", "Author"]}
        emptyTitle="No journal entries"
        emptyDescription="Chat with the AI about your day, then click Save as journal entry — or create one manually."
        createFields={journalCreateFields}
        renderRow={renderJournalRow}
        onRowClick={(item) => setSelectedId(String(item.id))}
      />
      <JournalDetailModal
        entryId={selectedId}
        onClose={() => {
          setSelectedId(null);
          router.replace("/journal");
        }}
      />
    </>
  );
}
