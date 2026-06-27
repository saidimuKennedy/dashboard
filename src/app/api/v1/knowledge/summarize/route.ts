import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody } from "@/lib/api/helpers";
import { knowledgeSummarizeSchema } from "@/lib/validations";
import { knowledgeRepository } from "@/server/repositories/knowledge.repository";
import { aiService } from "@/server/ai/ai.service";

export const POST = withAuth(async (request) => {
  const parsed = await parseBody(request, knowledgeSummarizeSchema);
  if (!parsed.ok) return parsed.response;
  let content = parsed.data.content;
  if (parsed.data.id) {
    const article = await knowledgeRepository.getById(parsed.data.id);
    if (!article) return notFound("Article not found.");
    content = article.content;
  }
  const result = await aiService.summarize(content!, "knowledge");
  return success(result);
}, "ai.use");
