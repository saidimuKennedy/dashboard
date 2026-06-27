import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody } from "@/lib/api/helpers";
import { meetingSummarySchema } from "@/lib/validations";
import { meetingRepository } from "@/server/repositories/domains.repository";
import { aiService } from "@/server/ai/ai.service";

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, meetingSummarySchema);
  if (!parsed.ok) return parsed.response;
  const meeting = await meetingRepository.getById(parsed.data.meetingId);
  if (!meeting) return notFound("Meeting not found.");
  const content = meeting.transcript ?? meeting.minutes ?? meeting.agenda ?? meeting.title;
  const result = await aiService.summarize(content, "meeting");
  await meetingRepository.update(parsed.data.meetingId, { aiSummary: result.response }, user.id);
  return success(result);
}, "ai.use");
