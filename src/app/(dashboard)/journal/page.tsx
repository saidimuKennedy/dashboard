import { ModulePageClient } from "@/components/dashboard/module-page-client";
import { journalCreateFields } from "@/config/module-create-fields";

export default function JournalPage() {
  return (
    <ModulePageClient
      title="Founder Journal"
      description="Daily reflections, lessons learned, and strategic thinking."
      ctaLabel="New Entry"
      endpoint="/api/v1/journal"
      columns={["Date", "Mood", "Updated", "Author"]}
      emptyTitle="No journal entries"
      emptyDescription="Chat with the AI about your day, then click Save as journal entry — or create one manually."
      createFields={journalCreateFields}
    />
  );
}
