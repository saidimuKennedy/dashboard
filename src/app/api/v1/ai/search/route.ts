import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody } from "@/lib/api/helpers";
import { aiRequestSchema } from "@/lib/validations";
import { aiService } from "@/server/ai/ai.service";

export const POST = withAuth(async (request) => {
  const parsed = await parseBody(request, aiRequestSchema);
  if (!parsed.ok) return parsed.response;
  const sources = await aiService.searchSemantic(parsed.data.prompt);
  return success({ sources });
}, "ai.use");
