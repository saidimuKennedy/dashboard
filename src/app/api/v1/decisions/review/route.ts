import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { decisionReviewSchema } from "@/lib/validations";
import { decisionRepository } from "@/server/repositories/domains.repository";
import { auditLog } from "@/lib/logger/audit";
import { db } from "@/lib/db";

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, decisionReviewSchema);
  if (!parsed.ok) return parsed.response;
  const existing = await db.decision.findFirst({ where: { id: parsed.data.id, deletedAt: null } });
  if (!existing) return notFound("Decision not found.");
  const decision = await decisionRepository.update(parsed.data.id, { outcome: parsed.data.outcome, status: parsed.data.status ?? "REVIEWED" }, user.id);
  await auditLog({ userId: user.id, action: "decision.review", resource: "decisions", resourceId: parsed.data.id, ipAddress: getClientIp(request) });
  return success(decision, "Decision reviewed.");
});
