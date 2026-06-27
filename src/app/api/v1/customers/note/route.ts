import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { customerNoteSchema } from "@/lib/validations";
import { customerRepository } from "@/server/repositories/dashboard.repository";
import { auditLog } from "@/lib/logger/audit";

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, customerNoteSchema);
  if (!parsed.ok) return parsed.response;
  const customer = await customerRepository.getById(parsed.data.customerId);
  if (!customer) return notFound("Customer not found.");
  const updated = await customerRepository.update(parsed.data.customerId, { notes: parsed.data.note });
  await auditLog({ userId: user.id, action: "customer.note", resource: "customers", resourceId: parsed.data.customerId, ipAddress: getClientIp(request) });
  return success(updated, "Note added.");
}, "customer.manage");
