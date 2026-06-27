import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody, getClientIp, paginatedData } from "@/lib/api/helpers";
import { parsePagination } from "@/lib/api/response";
import { createThreatSchema } from "@/lib/validations";
import { auditLog, recordEvent } from "@/lib/logger/audit";
import { db } from "@/lib/db";

export const GET = withAuth(async (request) => {
  const { page, limit, skip } = parsePagination(request.nextUrl.searchParams);
  const where = { eventType: "security.threat" };
  const [items, total] = await Promise.all([
    db.event.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
    db.event.count({ where }),
  ]);
  return success(paginatedData(items, total, page, limit));
}, "compliance.manage");

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, createThreatSchema);
  if (!parsed.ok) return parsed.response;
  await recordEvent({ eventType: "security.threat", actorId: user.id, metadata: parsed.data, severity: parsed.data.severity === "CRITICAL" ? "CRITICAL" : "HIGH" });
  await auditLog({ userId: user.id, action: "security.threat.create", resource: "security", ipAddress: getClientIp(request), metadata: parsed.data });
  return success({ threat: parsed.data, status: "recorded" }, "Threat recorded.", 201);
}, "compliance.manage");
