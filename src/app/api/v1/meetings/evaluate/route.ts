import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody } from "@/lib/api/helpers";
import { meetingEvaluateSchema } from "@/lib/validations";
import { meetingRepository } from "@/server/repositories/domains.repository";
import { aiService } from "@/server/ai/ai.service";

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, meetingEvaluateSchema);
  if (!parsed.ok) return parsed.response;

  const meeting = await meetingRepository.getById(parsed.data.meetingId);
  if (!meeting) return notFound("Meeting not found.");

  const result = await aiService.evaluateMeeting({
    title: meeting.title,
    agenda: meeting.agenda,
    outcomeReport: meeting.outcomeReport,
    minutes: meeting.minutes,
    transcript: meeting.transcript,
    aiSummary: meeting.aiSummary,
    actionItems: meeting.actionItems.map((item) => item.title),
  });

  await meetingRepository.update(
    parsed.data.meetingId,
    {
      aiEvaluation: result.response,
      outcome: result.evaluation.rating,
    },
    user.id
  );

  return success({
    evaluation: result.evaluation,
    tokens: result.tokens,
  });
}, "ai.use");
