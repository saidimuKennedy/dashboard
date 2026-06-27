import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody } from "@/lib/api/helpers";
import { meetingActionItemsSchema } from "@/lib/validations";
import { meetingRepository } from "@/server/repositories/domains.repository";
import { aiService } from "@/server/ai/ai.service";
import { db } from "@/lib/db";

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, meetingActionItemsSchema);
  if (!parsed.ok) return parsed.response;
  const meeting = await meetingRepository.getById(parsed.data.meetingId);
  if (!meeting) return notFound("Meeting not found.");
  const content = parsed.data.transcript ?? meeting.transcript ?? meeting.minutes ?? "";
  const result = await aiService.summarize(content, "action-items");
  const items = result.response.split("\n").filter(Boolean).map((title) => ({ title, meetingId: parsed.data.meetingId, createdBy: user.id }));
  if (items.length) await db.actionItem.createMany({ data: items });
  return success({ actionItems: items, summary: result.response });
}, "ai.use");
