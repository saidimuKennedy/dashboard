import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { updateApiRegistrySchema } from "@/lib/validations";
import { apiRegistryRepository } from "@/server/repositories/domains.repository";
import { auditLog } from "@/lib/logger/audit";
import { db } from "@/lib/db";

export const PATCH = withAuth(async (request, { user, params }) => {
  const parsed = await parseBody(request, updateApiRegistrySchema);
  if (!parsed.ok) return parsed.response;
  const existing = await db.apiRegistryEntry.findFirst({ where: { id: params!.id, deletedAt: null } });
  if (!existing) return notFound("API entry not found.");
  const entry = await apiRegistryRepository.update(params!.id, parsed.data);
  await auditLog({ userId: user.id, action: "api_registry.update", resource: "apis", resourceId: params!.id, ipAddress: getClientIp(request) });
  return success(entry, "API entry updated.");
}, "knowledge.write");

export const DELETE = withAuth(async (request, { user, params }) => {
  const existing = await db.apiRegistryEntry.findFirst({ where: { id: params!.id, deletedAt: null } });
  if (!existing) return notFound("API entry not found.");
  await db.apiRegistryEntry.update({ where: { id: params!.id }, data: { deletedAt: new Date() } });
  await auditLog({ userId: user.id, action: "api_registry.delete", resource: "apis", resourceId: params!.id, ipAddress: getClientIp(request) });
  return success(null, "API entry deleted.");
}, "knowledge.delete");
