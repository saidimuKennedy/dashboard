import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { updateRevenueSchema } from "@/lib/validations";
import { auditLog } from "@/lib/logger/audit";
import { db } from "@/lib/db";

export const PATCH = withAuth(async (request, { user, params }) => {
  const parsed = await parseBody(request, updateRevenueSchema);
  if (!parsed.ok) return parsed.response;
  const existing = await db.revenueEntry.findFirst({ where: { id: params!.id, deletedAt: null } });
  if (!existing) return notFound("Revenue entry not found.");
  const entry = await db.revenueEntry.update({ where: { id: params!.id }, data: parsed.data });
  await auditLog({ userId: user.id, action: "revenue.update", resource: "revenue", resourceId: params!.id, ipAddress: getClientIp(request) });
  return success(entry, "Revenue entry updated.");
}, "revenue.manage");

export const DELETE = withAuth(async (request, { user, params }) => {
  const existing = await db.revenueEntry.findFirst({ where: { id: params!.id, deletedAt: null } });
  if (!existing) return notFound("Revenue entry not found.");
  await db.revenueEntry.update({ where: { id: params!.id }, data: { deletedAt: new Date() } });
  await auditLog({ userId: user.id, action: "revenue.delete", resource: "revenue", resourceId: params!.id, ipAddress: getClientIp(request) });
  return success(null, "Revenue entry deleted.");
}, "revenue.manage");
