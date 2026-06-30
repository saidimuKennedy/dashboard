import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody, getClientIp, paginatedData } from "@/lib/api/helpers";
import { parsePagination } from "@/lib/api/response";
import { createIncidentSchema } from "@/lib/validations";
import { auditLog } from "@/lib/logger/audit";
import { db } from "@/lib/db";
import { scheduleRagIndex } from "@/server/ai/rag/indexer.service";

export const GET = withAuth(async (request) => {
  const { page, limit, skip } = parsePagination(request.nextUrl.searchParams);
  const where = { deletedAt: null };
  const [items, total] = await Promise.all([
    db.securityIncident.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
    db.securityIncident.count({ where }),
  ]);
  return success(paginatedData(items, total, page, limit));
}, "compliance.manage");

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, createIncidentSchema);
  if (!parsed.ok) return parsed.response;
  const incident = await db.securityIncident.create({ data: parsed.data });
  scheduleRagIndex("security_incident", incident.id);
  await auditLog({ userId: user.id, action: "security.incident.create", resource: "security", resourceId: incident.id, ipAddress: getClientIp(request) });
  return success(incident, "Incident recorded.", 201);
}, "compliance.manage");
