import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody, getClientIp, paginatedData } from "@/lib/api/helpers";
import { parsePagination } from "@/lib/api/response";
import { createRiskSchema, updateRiskSchema } from "@/lib/validations";
import { riskRepository } from "@/server/repositories/domains.repository";
import { auditLog } from "@/lib/logger/audit";
import { RiskCategory } from "@prisma/client";

export const GET = withAuth(async (request) => {
  const { page, limit, skip } = parsePagination(request.nextUrl.searchParams);
  const category = request.nextUrl.searchParams.get("category") as RiskCategory | null;
  const { items, total } = await riskRepository.list(skip, limit, category ?? undefined);
  return success(paginatedData(items, total, page, limit));
}, "compliance.manage");

export const PATCH = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, updateRiskSchema);
  if (!parsed.ok) return parsed.response;
  const { id, ...data } = parsed.data;
  const risk = await riskRepository.update(id, data);
  if (!risk) return notFound("Risk not found.");
  await auditLog({ userId: user.id, action: "security.risk.update", resource: "security", resourceId: id, ipAddress: getClientIp(request) });
  return success(risk, "Risk updated.");
}, "compliance.manage");
