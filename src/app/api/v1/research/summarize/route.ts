import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody } from "@/lib/api/helpers";
import { researchSummarizeSchema } from "@/lib/validations";
import { aiService } from "@/server/ai/ai.service";
import { db } from "@/lib/db";

export const POST = withAuth(async (request) => {
  const parsed = await parseBody(request, researchSummarizeSchema);
  if (!parsed.ok) return parsed.response;
  const topic = await db.researchTopic.findFirst({ where: { id: parsed.data.id, deletedAt: null } });
  if (!topic) return notFound("Research topic not found.");
  const content = [topic.title, topic.description, topic.notes].filter(Boolean).join("\n");
  const result = await aiService.summarize(content, "research");
  return success(result);
}, "ai.use");
