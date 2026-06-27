import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { updateDecisionSchema } from "@/lib/validations";
import { decisionRepository } from "@/server/repositories/domains.repository";
import { auditLog } from "@/lib/logger/audit";
import { db } from "@/lib/db";

export const PATCH = withAuth(async (request, { user, params }) => {
  const parsed = await parseBody(request, updateDecisionSchema);
  if (!parsed.ok) return parsed.response;
  const existing = await db.decision.findFirst({ where: { id: params!.id, deletedAt: null } });
  if (!existing) return notFound("Decision not found.");
  const decision = await decisionRepository.update(params!.id, parsed.data, user.id);
  await auditLog({ userId: user.id, action: "decision.update", resource: "decisions", resourceId: params!.id, ipAddress: getClientIp(request) });
  return success(decision, "Decision updated.");
});

export const DELETE = withAuth(async (request, { user, params }) => {
  const existing = await db.decision.findFirst({ where: { id: params!.id, deletedAt: null } });
  if (!existing) return notFound("Decision not found.");
  await decisionRepository.softDelete(params!.id, user.id);
  await auditLog({ userId: user.id, action: "decision.delete", resource: "decisions", resourceId: params!.id, ipAddress: getClientIp(request) });
  return success(null, "Decision deleted.");
});
