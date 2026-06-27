import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody, getClientIp, paginatedData } from "@/lib/api/helpers";
import { parsePagination } from "@/lib/api/response";
import { createRiskSchema } from "@/lib/validations";
import { riskRepository } from "@/server/repositories/domains.repository";
import { auditLog } from "@/lib/logger/audit";
import { RiskCategory } from "@prisma/client";

export const GET = withAuth(async (request) => {
  const { page, limit, skip } = parsePagination(request.nextUrl.searchParams);
  const category = request.nextUrl.searchParams.get("category") as RiskCategory | null;
  const { items, total } = await riskRepository.list(skip, limit, category ?? undefined);
  return success(paginatedData(items, total, page, limit));
});

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, createRiskSchema);
  if (!parsed.ok) return parsed.response;
  const item = await riskRepository.create({ ...parsed.data, ownerId: parsed.data.ownerId ?? user.id });
  await auditLog({
    userId: user.id,
    action: "risk.create",
    resource: "risks",
    resourceId: item.id,
    ipAddress: getClientIp(request),
  });
  return success(item, "Risk created.", 201);
});
