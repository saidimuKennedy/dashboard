"use client";

import { ModulePageClient } from "@/components/dashboard/module-page-client";
import { journalCreateFields } from "@/config/module-create-fields";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";

function renderJournalRow(item: Record<string, unknown>) {
  const date = item.date ? new Date(String(item.date)).toLocaleDateString() : "—";
  const updated = item.updatedAt
    ? new Date(String(item.updatedAt)).toLocaleDateString()
    : "—";
  const mood = item.mood ? String(item.mood) : "—";
  const author = (item.author as { firstName?: string })?.firstName ?? "—";
  const preview = String(item.aiSummary ?? item.content ?? "—");
  const excerpt = preview.length > 100 ? `${preview.slice(0, 100)}…` : preview;

  return (
    <TableRow key={String(item.id)}>
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
  return (
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
    />
  );
}
