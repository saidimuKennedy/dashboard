import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { meetingImportSchema } from "@/lib/validations";
import { meetingRepository } from "@/server/repositories/domains.repository";
import { parseIcsEvents } from "@/lib/meetings/calendar-import";
import { auditLog } from "@/lib/logger/audit";

export const POST = withAuth(async (request, { user }) => {
  const contentType = request.headers.get("content-type") ?? "";
  let events;

  if (contentType.includes("text/calendar")) {
    const ics = await request.text();
    events = parseIcsEvents(ics);
    if (!events.length) {
      return success({ created: 0, updated: 0, skipped: 0, meetings: [] }, "No events found in ICS feed.");
    }
  } else {
    const parsed = await parseBody(request, meetingImportSchema);
    if (!parsed.ok) return parsed.response;
    events = parsed.data.events;
  }

  const result = await meetingRepository.importCalendarEvents(events, user.id);
  await auditLog({
    userId: user.id,
    action: "meeting.import",
    resource: "meetings",
    metadata: result,
    ipAddress: getClientIp(request),
  });

  return success(result, `Imported ${result.created + result.updated} meeting(s).`);
});
