import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody } from "@/lib/api/helpers";
import { searchSchema } from "@/lib/validations";
import { aiService } from "@/server/ai/ai.service";

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, searchSchema);
  if (!parsed.ok) return parsed.response;
  const sources = await aiService.searchSemantic(parsed.data.query, user.role);
  return success({ results: sources });
});
