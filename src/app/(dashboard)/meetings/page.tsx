import { ModulePageClient } from "@/components/dashboard/module-page-client";
import { meetingsCreateFields } from "@/config/module-create-fields";

export default function MeetingsPage() {
  return (
    <ModulePageClient
      title="Meetings"
      description="Agendas, transcripts, action items, and AI summaries."
      ctaLabel="Schedule Meeting"
      endpoint="/api/v1/meetings"
      columns={["Title", "Status", "Scheduled", "Participants"]}
      emptyTitle="No meetings"
      emptyDescription="Schedule meetings and let AI capture summaries and action items."
      createFields={meetingsCreateFields}
    />
  );
}
