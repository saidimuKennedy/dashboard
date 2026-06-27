import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { createApiRegistrySchema } from "@/lib/validations";
import { apiRegistryRepository } from "@/server/repositories/domains.repository";
import { auditLog } from "@/lib/logger/audit";

export const GET = withAuth(async () => {
  const items = await apiRegistryRepository.list();
  return success({ items });
}, "knowledge.read");

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, createApiRegistrySchema);
  if (!parsed.ok) return parsed.response;
  const entry = await apiRegistryRepository.create(parsed.data);
  await auditLog({ userId: user.id, action: "api_registry.create", resource: "apis", resourceId: entry.id, ipAddress: getClientIp(request) });
  return success(entry, "API entry created.", 201);
}, "knowledge.write");
