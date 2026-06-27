import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody, getClientIp, paginatedData } from "@/lib/api/helpers";
import { parsePagination } from "@/lib/api/response";
import { createDecisionSchema } from "@/lib/validations";
import { decisionRepository } from "@/server/repositories/domains.repository";
import { auditLog } from "@/lib/logger/audit";

export const GET = withAuth(async (request) => {
  const { page, limit, skip } = parsePagination(request.nextUrl.searchParams);
  const { items, total } = await decisionRepository.list(skip, limit);
  return success(paginatedData(items, total, page, limit));
});

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, createDecisionSchema);
  if (!parsed.ok) return parsed.response;
  const decision = await decisionRepository.create({ ...parsed.data, ownerId: parsed.data.ownerId ?? user.id });
  await auditLog({ userId: user.id, action: "decision.create", resource: "decisions", resourceId: decision.id, ipAddress: getClientIp(request) });
  return success(decision, "Decision created.", 201);
});
