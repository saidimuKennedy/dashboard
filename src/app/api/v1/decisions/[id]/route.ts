import { withAuth } from "@/lib/api/middleware";
import { success, notFound, error } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { updateDecisionSchema } from "@/lib/validations";
import { decisionRepository, InvalidStatusTransitionError } from "@/server/repositories/domains.repository";
import { auditLog } from "@/lib/logger/audit";
import { db } from "@/lib/db";

export const GET = withAuth(async (_request, { params }) => {
  const decision = await decisionRepository.getById(params!.id);
  if (!decision) return notFound("Decision not found.");
  return success(decision);
});

export const PATCH = withAuth(async (request, { user, params }) => {
  const parsed = await parseBody(request, updateDecisionSchema);
  if (!parsed.ok) return parsed.response;
  const existing = await db.decision.findFirst({ where: { id: params!.id, deletedAt: null } });
  if (!existing) return notFound("Decision not found.");

  let decision;
  try {
    decision = await decisionRepository.update(params!.id, parsed.data, user.id);
  } catch (err) {
    if (err instanceof InvalidStatusTransitionError) {
      return error(err.message, err.code, 400);
    }
    throw err;
  }

  if (!decision) return notFound("Decision not found.");

  await auditLog({
    userId: user.id,
    action: "decision.update",
    resource: "decisions",
    resourceId: params!.id,
    ipAddress: getClientIp(request),
    metadata:
      parsed.data.status && parsed.data.status !== existing.status
        ? { fromStatus: existing.status, toStatus: parsed.data.status }
        : undefined,
  });
  return success(decision, "Decision updated.");
});

export const DELETE = withAuth(async (request, { user, params }) => {
  const existing = await db.decision.findFirst({ where: { id: params!.id, deletedAt: null } });
  if (!existing) return notFound("Decision not found.");
  await decisionRepository.softDelete(params!.id, user.id);
  await auditLog({ userId: user.id, action: "decision.delete", resource: "decisions", resourceId: params!.id, ipAddress: getClientIp(request) });
  return success(null, "Decision deleted.");
});
