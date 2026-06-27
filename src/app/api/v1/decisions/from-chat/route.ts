import { withAuth } from "@/lib/api/middleware";
import { success, error } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { decisionFromChatSchema } from "@/lib/validations";
import { decisionRepository } from "@/server/repositories/domains.repository";
import { auditLog } from "@/lib/logger/audit";
import { aiService } from "@/server/ai/ai.service";

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, decisionFromChatSchema);
  if (!parsed.ok) return parsed.response;

  const { messages } = parsed.data;
  const { analysis, tokens } = await aiService.analyzeDecisionChat(messages);

  const reviewDate = analysis.reviewDateSuggestion
    ? new Date(analysis.reviewDateSuggestion)
  : undefined;

  const decision = await decisionRepository.create(
    {
      title: analysis.title,
      context: analysis.context,
      alternatives: analysis.alternatives,
      decision: analysis.decision,
      reasoning: analysis.reasoning,
      evidence: analysis.evidence,
      reviewDate: reviewDate && !Number.isNaN(reviewDate.getTime()) ? reviewDate : undefined,
      status: "APPROVED",
      ownerId: user.id,
    },
    user.id
  );

  if (!decision) {
    return error("Failed to create decision.", "CREATE_FAILED", 500);
  }

  await auditLog({
    userId: user.id,
    action: "decision.create_from_chat",
    resource: "decisions",
    resourceId: decision.id,
    ipAddress: getClientIp(request),
    metadata: { tokens },
  });

  return success(decision, "Decision logged from AI chat.", 201);
});
