import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { complianceEvidenceSchema } from "@/lib/validations";
import { complianceRepository } from "@/server/repositories/domains.repository";
import { auditLog } from "@/lib/logger/audit";
import { db } from "@/lib/db";

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, complianceEvidenceSchema);
  if (!parsed.ok) return parsed.response;
  const existing = await db.complianceItem.findFirst({ where: { id: parsed.data.id, deletedAt: null } });
  if (!existing) return notFound("Compliance item not found.");
  const item = await complianceRepository.update(parsed.data.id, { evidence: parsed.data.evidence });
  await auditLog({ userId: user.id, action: "compliance.evidence", resource: "compliance", resourceId: parsed.data.id, ipAddress: getClientIp(request) });
  return success(item, "Evidence uploaded.");
}, "compliance.manage");
