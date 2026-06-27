import { withAuth } from "@/lib/api/middleware";
import { success, notFound, error } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { decisionReviewSchema } from "@/lib/validations";
import { decisionRepository, InvalidStatusTransitionError } from "@/server/repositories/domains.repository";
import { auditLog } from "@/lib/logger/audit";
import { db } from "@/lib/db";

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, decisionReviewSchema);
  if (!parsed.ok) return parsed.response;
  const existing = await db.decision.findFirst({ where: { id: parsed.data.id, deletedAt: null } });
  if (!existing) return notFound("Decision not found.");

  let decision;
  try {
    decision = await decisionRepository.recordReview(parsed.data.id, user.id, parsed.data.outcome);
  } catch (err) {
    if (err instanceof InvalidStatusTransitionError) {
      return error(
        `Cannot mark reviewed from ${existing.status}. Move to Implemented first, or supersede the decision.`,
        err.code,
        400
      );
    }
    throw err;
  }

  if (!decision) return notFound("Decision not found.");

  await auditLog({
    userId: user.id,
    action: "decision.review",
    resource: "decisions",
    resourceId: parsed.data.id,
    ipAddress: getClientIp(request),
    metadata: { fromStatus: existing.status, toStatus: "REVIEWED" },
  });
  return success(decision, "Decision reviewed.");
});
