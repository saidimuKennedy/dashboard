import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody, getClientIp, paginatedData } from "@/lib/api/helpers";
import { parsePagination } from "@/lib/api/response";
import { createCustomerSchema } from "@/lib/validations";
import { customerRepository } from "@/server/repositories/dashboard.repository";
import { auditLog } from "@/lib/logger/audit";

export const GET = withAuth(async (request) => {
  const { page, limit, skip } = parsePagination(request.nextUrl.searchParams);
  const search = request.nextUrl.searchParams.get("search") ?? undefined;
  const { items, total } = await customerRepository.list(skip, limit, search);
  return success(paginatedData(items, total, page, limit));
}, "customer.manage");

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, createCustomerSchema);
  if (!parsed.ok) return parsed.response;
  const customer = await customerRepository.create(parsed.data);
  await auditLog({ userId: user.id, action: "customer.create", resource: "customers", resourceId: customer.id, ipAddress: getClientIp(request) });
  return success(customer, "Customer created.", 201);
}, "customer.manage");
