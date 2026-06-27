import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { updateComplianceSchema } from "@/lib/validations";
import { complianceRepository } from "@/server/repositories/domains.repository";
import { auditLog } from "@/lib/logger/audit";
import { db } from "@/lib/db";

export const GET = withAuth(async (_request, { params }) => {
  const item = await complianceRepository.getById(params!.id);
  if (!item) return notFound("Compliance item not found.");
  return success(item);
}, "compliance.manage");

export const PATCH = withAuth(async (request, { user, params }) => {
  const parsed = await parseBody(request, updateComplianceSchema);
  if (!parsed.ok) return parsed.response;
  const existing = await db.complianceItem.findFirst({ where: { id: params!.id, deletedAt: null } });
  if (!existing) return notFound("Compliance item not found.");
  const item = await complianceRepository.update(params!.id, parsed.data);
  await auditLog({ userId: user.id, action: "compliance.update", resource: "compliance", resourceId: params!.id, ipAddress: getClientIp(request) });
  return success(item, "Compliance item updated.");
}, "compliance.manage");

export const DELETE = withAuth(async (request, { user, params }) => {
  const existing = await db.complianceItem.findFirst({ where: { id: params!.id, deletedAt: null } });
  if (!existing) return notFound("Compliance item not found.");
  await db.complianceItem.update({ where: { id: params!.id }, data: { deletedAt: new Date() } });
  await auditLog({ userId: user.id, action: "compliance.delete", resource: "compliance", resourceId: params!.id, ipAddress: getClientIp(request) });
  return success(null, "Compliance item deleted.");
}, "compliance.manage");
