import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { competitorFeaturesSchema } from "@/lib/validations";
import { competitorRepository } from "@/server/repositories/domains.repository";
import { auditLog } from "@/lib/logger/audit";
import { db } from "@/lib/db";

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, competitorFeaturesSchema);
  if (!parsed.ok) return parsed.response;
  const existing = await db.competitor.findFirst({ where: { id: parsed.data.id, deletedAt: null } });
  if (!existing) return notFound("Competitor not found.");
  const competitor = await competitorRepository.update(parsed.data.id, { features: parsed.data.features });
  await auditLog({ userId: user.id, action: "competitor.features", resource: "competitors", resourceId: parsed.data.id, ipAddress: getClientIp(request) });
  return success(competitor, "Features updated.");
}, "knowledge.write");
