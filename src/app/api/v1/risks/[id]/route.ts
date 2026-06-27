import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { updateRiskPatchSchema } from "@/lib/validations";
import { riskRepository } from "@/server/repositories/domains.repository";
import { auditLog } from "@/lib/logger/audit";
import { db } from "@/lib/db";

export const GET = withAuth(async (_request, { params }) => {
  const risk = await riskRepository.getById(params!.id);
  if (!risk) return notFound("Risk not found.");
  return success(risk);
});

export const PATCH = withAuth(async (request, { user, params }) => {
  const parsed = await parseBody(request, updateRiskPatchSchema);
  if (!parsed.ok) return parsed.response;
  const existing = await db.risk.findFirst({ where: { id: params!.id, deletedAt: null } });
  if (!existing) return notFound("Risk not found.");
  const risk = await riskRepository.update(params!.id, parsed.data);
  await auditLog({
    userId: user.id,
    action: "risk.update",
    resource: "risks",
    resourceId: params!.id,
    ipAddress: getClientIp(request),
  });
  return success(risk, "Risk updated.");
});

export const DELETE = withAuth(async (request, { user, params }) => {
  const existing = await db.risk.findFirst({ where: { id: params!.id, deletedAt: null } });
  if (!existing) return notFound("Risk not found.");
  await riskRepository.softDelete(params!.id);
  await auditLog({
    userId: user.id,
    action: "risk.delete",
    resource: "risks",
    resourceId: params!.id,
    ipAddress: getClientIp(request),
  });
  return success(null, "Risk deleted.");
});
