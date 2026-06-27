import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
const BASE = "/home/saidimu/Desktop/next/dashboard/src/app/api/v1";
function w(p, c) { const f = join(BASE, p); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, c.trimStart() + "\n"); return f; }

const R = {
"revenue/route.ts": `import { NextRequest } from "next/server";
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
  if ("error" in parsed) return parsed.error;
  const entry = await revenueRepository.create(parsed.data);
  await auditLog({ userId: user.id, action: "revenue.create", resource: "revenue", resourceId: entry.id, ipAddress: getClientIp(request) });
  return success(entry, "Revenue entry created.", 201);
}, "revenue.manage");`,

"revenue/[id]/route.ts": `import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { updateRevenueSchema } from "@/lib/validations";
import { auditLog } from "@/lib/logger/audit";
import { db } from "@/lib/db";

export const PATCH = withAuth(async (request, { user, params }) => {
  const parsed = await parseBody(request, updateRevenueSchema);
  if ("error" in parsed) return parsed.error;
  const existing = await db.revenueEntry.findFirst({ where: { id: params!.id, deletedAt: null } });
  if (!existing) return notFound("Revenue entry not found.");
  const entry = await db.revenueEntry.update({ where: { id: params!.id }, data: parsed.data });
  await auditLog({ userId: user.id, action: "revenue.update", resource: "revenue", resourceId: params!.id, ipAddress: getClientIp(request) });
  return success(entry, "Revenue entry updated.");
}, "revenue.manage");

export const DELETE = withAuth(async (request, { user, params }) => {
  const existing = await db.revenueEntry.findFirst({ where: { id: params!.id, deletedAt: null } });
  if (!existing) return notFound("Revenue entry not found.");
  await db.revenueEntry.update({ where: { id: params!.id }, data: { deletedAt: new Date() } });
  await auditLog({ userId: user.id, action: "revenue.delete", resource: "revenue", resourceId: params!.id, ipAddress: getClientIp(request) });
  return success(null, "Revenue entry deleted.");
}, "revenue.manage");`,

"revenue/mrr/route.ts": `import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { revenueRepository } from "@/server/repositories/domains.repository";

export const GET = withAuth(async () => {
  const mrr = await revenueRepository.getMrr();
  return success({ mrr, currency: "KES" });
}, "revenue.manage");`,

"revenue/forecast/route.ts": `import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { revenueRepository } from "@/server/repositories/domains.repository";

export const GET = withAuth(async () => {
  const forecast = await revenueRepository.getForecast();
  return success(forecast);
}, "revenue.manage");`,

"revenue/reports/route.ts": `import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { db } from "@/lib/db";

export const GET = withAuth(async () => {
  const [total, byType, recent] = await Promise.all([
    db.revenueEntry.aggregate({ where: { deletedAt: null }, _sum: { amount: true }, _count: true }),
    db.revenueEntry.groupBy({ by: ["type"], where: { deletedAt: null }, _sum: { amount: true }, _count: true }),
    db.revenueEntry.findMany({ where: { deletedAt: null }, take: 10, orderBy: { recordedAt: "desc" } }),
  ]);
  return success({ total: Number(total._sum.amount ?? 0), count: total._count, byType, recent });
}, "revenue.manage");`,

"compliance/route.ts": `import { NextRequest } from "next/server";
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
  if ("error" in parsed) return parsed.error;
  const item = await complianceRepository.create(parsed.data);
  await auditLog({ userId: user.id, action: "compliance.create", resource: "compliance", resourceId: item.id, ipAddress: getClientIp(request) });
  return success(item, "Compliance item created.", 201);
}, "compliance.manage");`,

"compliance/[id]/route.ts": `import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { updateComplianceSchema } from "@/lib/validations";
import { complianceRepository } from "@/server/repositories/domains.repository";
import { auditLog } from "@/lib/logger/audit";
import { db } from "@/lib/db";

export const PATCH = withAuth(async (request, { user, params }) => {
  const parsed = await parseBody(request, updateComplianceSchema);
  if ("error" in parsed) return parsed.error;
  const existing = await db.complianceItem.findFirst({ where: { id: params!.id, deletedAt: null } });
  if (!existing) return notFound("Compliance item not found.");
  const item = await complianceRepository.update(params!.id, parsed.data);
  await auditLog({ userId: user.id, action: "compliance.update", resource: "compliance", resourceId: params!.id, ipAddress: getClientIp(request) });
  return success(item, "Compliance item updated.");
}, "compliance.manage");

export const DELETE = withAuth(async (request, { user, params }) => {
  const existing = await db.complianceItem.findFirst({ where: { id: params!.id, deletedAt: null } });
  if (!existing) return notFound("Compliance item not found.");
  await db.complianceItem.update({ where: { id: params!.id }, data: { deletedAt: new Date() } });
  await auditLog({ userId: user.id, action: "compliance.delete", resource: "compliance", resourceId: params!.id, ipAddress: getClientIp(request) });
  return success(null, "Compliance item deleted.");
}, "compliance.manage");`,

"compliance/review/route.ts": `import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { complianceReviewSchema } from "@/lib/validations";
import { complianceRepository } from "@/server/repositories/domains.repository";
import { auditLog } from "@/lib/logger/audit";
import { db } from "@/lib/db";

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, complianceReviewSchema);
  if ("error" in parsed) return parsed.error;
  const existing = await db.complianceItem.findFirst({ where: { id: parsed.data.id, deletedAt: null } });
  if (!existing) return notFound("Compliance item not found.");
  const item = await complianceRepository.update(parsed.data.id, { status: parsed.data.status, description: parsed.data.notes ?? existing.description });
  await auditLog({ userId: user.id, action: "compliance.review", resource: "compliance", resourceId: parsed.data.id, ipAddress: getClientIp(request) });
  return success(item, "Compliance review recorded.");
}, "compliance.manage");`,

"compliance/deadlines/route.ts": `import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { complianceRepository } from "@/server/repositories/domains.repository";

export const GET = withAuth(async (request) => {
  const days = parseInt(request.nextUrl.searchParams.get("days") ?? "30", 10);
  const deadlines = await complianceRepository.getDeadlines(days);
  return success({ deadlines });
}, "compliance.manage");`,

"compliance/evidence/route.ts": `import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { complianceEvidenceSchema } from "@/lib/validations";
import { complianceRepository } from "@/server/repositories/domains.repository";
import { auditLog } from "@/lib/logger/audit";
import { db } from "@/lib/db";

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, complianceEvidenceSchema);
  if ("error" in parsed) return parsed.error;
  const existing = await db.complianceItem.findFirst({ where: { id: parsed.data.id, deletedAt: null } });
  if (!existing) return notFound("Compliance item not found.");
  const item = await complianceRepository.update(parsed.data.id, { evidence: parsed.data.evidence });
  await auditLog({ userId: user.id, action: "compliance.evidence", resource: "compliance", resourceId: parsed.data.id, ipAddress: getClientIp(request) });
  return success(item, "Evidence uploaded.");
}, "compliance.manage");`,

"security/incidents/route.ts": `import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody, getClientIp, paginatedData } from "@/lib/api/helpers";
import { parsePagination } from "@/lib/api/response";
import { createIncidentSchema } from "@/lib/validations";
import { auditLog } from "@/lib/logger/audit";
import { db } from "@/lib/db";

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
  if ("error" in parsed) return parsed.error;
  const incident = await db.securityIncident.create({ data: parsed.data });
  await auditLog({ userId: user.id, action: "security.incident.create", resource: "security", resourceId: incident.id, ipAddress: getClientIp(request) });
  return success(incident, "Incident recorded.", 201);
}, "compliance.manage");`,

"security/threats/route.ts": `import { NextRequest } from "next/server";
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
  if ("error" in parsed) return parsed.error;
  await recordEvent({ eventType: "security.threat", actorId: user.id, metadata: parsed.data, severity: parsed.data.severity === "CRITICAL" ? "CRITICAL" : "HIGH" });
  await auditLog({ userId: user.id, action: "security.threat.create", resource: "security", ipAddress: getClientIp(request), metadata: parsed.data });
  return success({ threat: parsed.data, status: "recorded" }, "Threat recorded.", 201);
}, "compliance.manage");`,

"security/risks/route.ts": `import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody, getClientIp, paginatedData } from "@/lib/api/helpers";
import { parsePagination } from "@/lib/api/response";
import { createRiskSchema, updateRiskSchema } from "@/lib/validations";
import { riskRepository } from "@/server/repositories/domains.repository";
import { auditLog } from "@/lib/logger/audit";
import { RiskCategory } from "@prisma/client";

export const GET = withAuth(async (request) => {
  const { page, limit, skip } = parsePagination(request.nextUrl.searchParams);
  const category = request.nextUrl.searchParams.get("category") as RiskCategory | null;
  const { items, total } = await riskRepository.list(skip, limit, category ?? undefined);
  return success(paginatedData(items, total, page, limit));
}, "compliance.manage");

export const PATCH = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, updateRiskSchema);
  if ("error" in parsed) return parsed.error;
  const { id, ...data } = parsed.data;
  const risk = await riskRepository.update(id, data);
  if (!risk) return notFound("Risk not found.");
  await auditLog({ userId: user.id, action: "security.risk.update", resource: "security", resourceId: id, ipAddress: getClientIp(request) });
  return success(risk, "Risk updated.");
}, "compliance.manage");`,
};

console.log(Object.entries(R).map(([p,c]) => w(p,c)).join("\n"));
