import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { decisionFromMeetingSchema } from "@/lib/validations";
import { decisionRepository } from "@/server/repositories/domains.repository";
import { auditLog } from "@/lib/logger/audit";
import { aiService } from "@/server/ai/ai.service";
import { db } from "@/lib/db";

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, decisionFromMeetingSchema);
  if (!parsed.ok) return parsed.response;

  const meeting = await db.meeting.findFirst({
    where: { id: parsed.data.meetingId, deletedAt: null },
  });
  if (!meeting) return notFound("Meeting not found.");

  const { decisions, tokens } = await aiService.extractMeetingDecisions({
    title: meeting.title,
    agenda: meeting.agenda,
    outcomeReport: meeting.outcomeReport,
    minutes: meeting.minutes,
    transcript: meeting.transcript,
    aiSummary: meeting.aiSummary,
  });

  if (!decisions.length) {
    return success({ items: [], count: 0 }, "No decisions found in this meeting.");
  }

  const meetingContext = `Source meeting: ${meeting.title} (${meeting.scheduledAt?.toISOString().slice(0, 10) ?? "unscheduled"})`;
  const created = await Promise.all(
    decisions.map((item) =>
      decisionRepository.create({
        title: item.title,
        context: `${item.context}\n\n${meetingContext}`,
        alternatives: item.alternatives,
        decision: item.decision,
        reasoning: item.reasoning,
        status: "APPROVED",
        ownerId: user.id,
        reviewDate: new Date(Date.now() + 90 * 86400000),
      })
    )
  );

  await auditLog({
    userId: user.id,
    action: "decision.create_from_meeting",
    resource: "decisions",
    resourceId: created[0]?.id,
    ipAddress: getClientIp(request),
    metadata: { meetingId: meeting.id, count: created.length, tokens },
  });

  return success(
    { items: created, count: created.length },
    created.length === 1 ? "1 decision logged from meeting." : `${created.length} decisions logged from meeting.`,
    201
  );
});
