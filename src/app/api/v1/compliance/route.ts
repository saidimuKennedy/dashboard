import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody, getClientIp, paginatedData } from "@/lib/api/helpers";
import { parsePagination } from "@/lib/api/response";
import { createComplianceSchema } from "@/lib/validations";
import { complianceRepository } from "@/server/repositories/domains.repository";
import { auditLog } from "@/lib/logger/audit";

export const GET = withAuth(async (request) => {
  const { page, limit, skip } = parsePagination(request.nextUrl.searchParams);
  const { items, total } = await complianceRepository.list(skip, limit);
  return success(paginatedData(items, total, page, limit));
}, "compliance.manage");

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, createComplianceSchema);
  if (!parsed.ok) return parsed.response;
  const item = await complianceRepository.create(parsed.data);
  await auditLog({ userId: user.id, action: "compliance.create", resource: "compliance", resourceId: item.id, ipAddress: getClientIp(request) });
  return success(item, "Compliance item created.", 201);
}, "compliance.manage");
