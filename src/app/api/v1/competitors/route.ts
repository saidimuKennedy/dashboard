import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { createCompetitorSchema } from "@/lib/validations";
import { competitorRepository } from "@/server/repositories/domains.repository";
import { auditLog } from "@/lib/logger/audit";

export const GET = withAuth(async () => {
  const items = await competitorRepository.list();
  return success({ items });
}, "knowledge.read");

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, createCompetitorSchema);
  if (!parsed.ok) return parsed.response;
  const competitor = await competitorRepository.create(parsed.data);
  await auditLog({ userId: user.id, action: "competitor.create", resource: "competitors", resourceId: competitor.id, ipAddress: getClientIp(request) });
  return success(competitor, "Competitor created.", 201);
}, "knowledge.write");
