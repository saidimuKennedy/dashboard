import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody } from "@/lib/api/helpers";
import { decisionPremortemSchema } from "@/lib/validations";
import { aiService } from "@/server/ai/ai.service";
import { formatPremortemEvidence } from "@/types/decision";

export const POST = withAuth(async (request) => {
  const parsed = await parseBody(request, decisionPremortemSchema);
  if (!parsed.ok) return parsed.response;

  const { premortem, tokens } = await aiService.premortemDecision(parsed.data);

  return success({
    premortem,
    evidence: formatPremortemEvidence(premortem),
    tokens,
  });
});
