import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody, getClientIp, paginatedData } from "@/lib/api/helpers";
import { parsePagination } from "@/lib/api/response";
import { createRevenueSchema } from "@/lib/validations";
import { revenueRepository } from "@/server/repositories/domains.repository";
import { auditLog } from "@/lib/logger/audit";
import { db } from "@/lib/db";

export const GET = withAuth(async (request) => {
  const { page, limit, skip } = parsePagination(request.nextUrl.searchParams);
  const { items, total } = await revenueRepository.list(skip, limit);
  return success(paginatedData(items, total, page, limit));
}, "revenue.manage");

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, createRevenueSchema);
  if (!parsed.ok) return parsed.response;
  const entry = await revenueRepository.create(parsed.data);
  await auditLog({ userId: user.id, action: "revenue.create", resource: "revenue", resourceId: entry.id, ipAddress: getClientIp(request) });
  return success(entry, "Revenue entry created.", 201);
}, "revenue.manage");
