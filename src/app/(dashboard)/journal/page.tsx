import { ModulePageClient } from "@/components/dashboard/module-page-client";

export default function JournalPage() {
  return (
    <ModulePageClient
      title="Founder Journal"
      description="Daily reflections, lessons learned, and strategic thinking."
      ctaLabel="New Entry"
      endpoint="/api/v1/journal"
      columns={["Date", "Mood", "Updated", "Author"]}
      emptyTitle="No journal entries"
      emptyDescription="Capture your daily reflections and track your founder journey."
    />
  );
}
