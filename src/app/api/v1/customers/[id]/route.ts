import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { updateCustomerSchema } from "@/lib/validations";
import { customerRepository } from "@/server/repositories/dashboard.repository";
import { auditLog } from "@/lib/logger/audit";

export const GET = withAuth(async (_request, { params }) => {
  const customer = await customerRepository.getById(params!.id);
  if (!customer) return notFound("Customer not found.");
  return success(customer);
}, "customer.manage");

export const PATCH = withAuth(async (request, { user, params }) => {
  const parsed = await parseBody(request, updateCustomerSchema);
  if (!parsed.ok) return parsed.response;
  const existing = await customerRepository.getById(params!.id);
  if (!existing) return notFound("Customer not found.");
  const customer = await customerRepository.update(params!.id, parsed.data);
  await auditLog({ userId: user.id, action: "customer.update", resource: "customers", resourceId: params!.id, ipAddress: getClientIp(request) });
  return success(customer, "Customer updated.");
}, "customer.manage");

export const DELETE = withAuth(async (request, { user, params }) => {
  const existing = await customerRepository.getById(params!.id);
  if (!existing) return notFound("Customer not found.");
  await customerRepository.softDelete(params!.id);
  await auditLog({ userId: user.id, action: "customer.delete", resource: "customers", resourceId: params!.id, ipAddress: getClientIp(request) });
  return success(null, "Customer deleted.");
}, "customer.manage");
