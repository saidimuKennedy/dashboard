import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody } from "@/lib/api/helpers";
import { decisionSimilarSchema } from "@/lib/validations";
import { aiService } from "@/server/ai/ai.service";

export const POST = withAuth(async (request) => {
  const parsed = await parseBody(request, decisionSimilarSchema);
  if (!parsed.ok) return parsed.response;

  const { excludeId, ...query } = parsed.data;
  const { items, tokens } = await aiService.findSimilarDecisions(query, excludeId);

  return success({ items, tokens });
});
