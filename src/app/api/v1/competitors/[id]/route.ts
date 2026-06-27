import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { updateCompetitorSchema } from "@/lib/validations";
import { competitorRepository } from "@/server/repositories/domains.repository";
import { auditLog } from "@/lib/logger/audit";
import { db } from "@/lib/db";

export const PATCH = withAuth(async (request, { user, params }) => {
  const parsed = await parseBody(request, updateCompetitorSchema);
  if (!parsed.ok) return parsed.response;
  const existing = await db.competitor.findFirst({ where: { id: params!.id, deletedAt: null } });
  if (!existing) return notFound("Competitor not found.");
  const competitor = await competitorRepository.update(params!.id, parsed.data);
  await auditLog({ userId: user.id, action: "competitor.update", resource: "competitors", resourceId: params!.id, ipAddress: getClientIp(request) });
  return success(competitor, "Competitor updated.");
}, "knowledge.write");

export const DELETE = withAuth(async (request, { user, params }) => {
  const existing = await db.competitor.findFirst({ where: { id: params!.id, deletedAt: null } });
  if (!existing) return notFound("Competitor not found.");
  await competitorRepository.softDelete(params!.id);
  await auditLog({ userId: user.id, action: "competitor.delete", resource: "competitors", resourceId: params!.id, ipAddress: getClientIp(request) });
  return success(null, "Competitor deleted.");
}, "knowledge.delete");
