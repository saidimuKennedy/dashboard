import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
const BASE = "/home/saidimu/Desktop/next/dashboard/src/app/api/v1";
function w(p, c) { const f = join(BASE, p); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, c.trimStart() + "\n"); return f; }

const R = {
"search/route.ts": `import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody } from "@/lib/api/helpers";
import { searchSchema } from "@/lib/validations";
import { knowledgeRepository } from "@/server/repositories/knowledge.repository";
import { db } from "@/lib/db";

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, searchSchema);
  if ("error" in parsed) return parsed.error;
  const limit = parsed.data.limit ?? 20;
  const results: Record<string, unknown[]> = {};
  if (!parsed.data.type || parsed.data.type === "all" || parsed.data.type === "knowledge") {
    results.knowledge = await knowledgeRepository.search(parsed.data.query, limit);
  }
  if (!parsed.data.type || parsed.data.type === "all" || parsed.data.type === "customers") {
    results.customers = (await db.customer.findMany({
      where: { deletedAt: null, OR: [{ name: { contains: parsed.data.query, mode: "insensitive" } }, { company: { contains: parsed.data.query, mode: "insensitive" } }] },
      take: limit,
    }));
  }
  await db.searchLog.create({ data: { userId: user.id, query: parsed.data.query, type: parsed.data.type ?? "all", results: Object.values(results).flat().length } });
  return success({ results });
});`,

"search/semantic/route.ts": `import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody } from "@/lib/api/helpers";
import { searchSchema } from "@/lib/validations";
import { aiService } from "@/server/ai/ai.service";

export const POST = withAuth(async (request) => {
  const parsed = await parseBody(request, searchSchema);
  if ("error" in parsed) return parsed.error;
  const sources = await aiService.searchSemantic(parsed.data.query);
  return success({ results: sources });
});`,

"search/fulltext/route.ts": `import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody } from "@/lib/api/helpers";
import { searchSchema } from "@/lib/validations";
import { knowledgeRepository } from "@/server/repositories/knowledge.repository";

export const POST = withAuth(async (request) => {
  const parsed = await parseBody(request, searchSchema);
  if ("error" in parsed) return parsed.error;
  const results = await knowledgeRepository.search(parsed.data.query, parsed.data.limit ?? 20);
  return success({ results });
});`,

"search/recent/route.ts": `import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parsePagination } from "@/lib/api/response";
import { paginatedData } from "@/lib/api/helpers";
import { db } from "@/lib/db";

export const GET = withAuth(async (request, { user }) => {
  const { page, limit, skip } = parsePagination(request.nextUrl.searchParams);
  const where = { userId: user.id };
  const [items, total] = await Promise.all([
    db.searchLog.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" }, distinct: ["query"] }),
    db.searchLog.count({ where }),
  ]);
  return success(paginatedData(items, total, page, limit));
});`,

"search/popular/route.ts": `import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { db } from "@/lib/db";

export const GET = withAuth(async () => {
  const popular = await db.searchLog.groupBy({
    by: ["query"],
    _count: { query: true },
    orderBy: { _count: { query: "desc" } },
    take: 20,
  });
  return success({ queries: popular.map((p) => ({ query: p.query, count: p._count.query })) });
});`,

"analytics/route.ts": `import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { dashboardRepository } from "@/server/repositories/dashboard.repository";
import { complianceRepository } from "@/server/repositories/domains.repository";

export const GET = withAuth(async () => {
  const [overview, complianceScore] = await Promise.all([
    dashboardRepository.getOverview(),
    complianceRepository.getScore(),
  ]);
  return success({ ...overview, complianceScore });
});`,

"analytics/revenue/route.ts": `import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { revenueRepository } from "@/server/repositories/domains.repository";
import { db } from "@/lib/db";

export const GET = withAuth(async () => {
  const [mrr, forecast, total] = await Promise.all([
    revenueRepository.getMrr(),
    revenueRepository.getForecast(),
    db.revenueEntry.aggregate({ where: { deletedAt: null }, _sum: { amount: true } }),
  ]);
  return success({ mrr, forecast, total: Number(total._sum.amount ?? 0) });
}, "revenue.manage");`,

"analytics/knowledge/route.ts": `import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { db } from "@/lib/db";

export const GET = withAuth(async () => {
  const [total, published, draft, byCategory] = await Promise.all([
    db.knowledgeArticle.count({ where: { deletedAt: null } }),
    db.knowledgeArticle.count({ where: { deletedAt: null, status: "PUBLISHED" } }),
    db.knowledgeArticle.count({ where: { deletedAt: null, status: "DRAFT" } }),
    db.knowledgeArticle.groupBy({ by: ["categoryId"], where: { deletedAt: null }, _count: true }),
  ]);
  return success({ total, published, draft, byCategory });
}, "knowledge.read");`,

"analytics/compliance/route.ts": `import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { complianceRepository } from "@/server/repositories/domains.repository";
import { db } from "@/lib/db";

export const GET = withAuth(async () => {
  const [score, byStatus, upcoming] = await Promise.all([
    complianceRepository.getScore(),
    db.complianceItem.groupBy({ by: ["status"], where: { deletedAt: null }, _count: true }),
    complianceRepository.getDeadlines(30),
  ]);
  return success({ score, byStatus, upcoming });
}, "compliance.manage");`,

"analytics/products/route.ts": `import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { db } from "@/lib/db";

export const GET = withAuth(async () => {
  const [total, releases, ideas] = await Promise.all([
    db.product.count({ where: { deletedAt: null } }),
    db.productRelease.count(),
    db.idea.count(),
  ]);
  return success({ total, releases, ideas });
});`,

"analytics/customers/route.ts": `import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { db } from "@/lib/db";

export const GET = withAuth(async () => {
  const [total, feedback, tickets] = await Promise.all([
    db.customer.count({ where: { deletedAt: null } }),
    db.customerFeedback.count(),
    db.supportTicket.count({ where: { deletedAt: null } }),
  ]);
  return success({ total, feedback, tickets });
}, "customer.manage");`,

"analytics/research/route.ts": `import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { db } from "@/lib/db";

export const GET = withAuth(async () => {
  const byStage = await db.researchTopic.groupBy({ by: ["stage"], where: { deletedAt: null }, _count: true });
  return success({ byStage });
}, "knowledge.read");`,

"analytics/founder/route.ts": `import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { dashboardRepository } from "@/server/repositories/dashboard.repository";
import { aiService } from "@/server/ai/ai.service";

export const GET = withAuth(async () => {
  const overview = await dashboardRepository.getOverview();
  const brief = await aiService.founderBrief();
  return success({ overview, brief });
});`,

"notifications/route.ts": `import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody, getClientIp, paginatedData } from "@/lib/api/helpers";
import { parsePagination } from "@/lib/api/response";
import { deleteNotificationsSchema } from "@/lib/validations";
import { auditLog } from "@/lib/logger/audit";
import { db } from "@/lib/db";

export const GET = withAuth(async (request, { user }) => {
  const { page, limit, skip } = parsePagination(request.nextUrl.searchParams);
  const unreadOnly = request.nextUrl.searchParams.get("unread") === "true";
  const where = { userId: user.id, ...(unreadOnly && { read: false }) };
  const [items, total] = await Promise.all([
    db.notification.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
    db.notification.count({ where }),
  ]);
  return success(paginatedData(items, total, page, limit));
});

export const DELETE = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, deleteNotificationsSchema);
  if ("error" in parsed) return parsed.error;
  if (parsed.data.all) {
    await db.notification.deleteMany({ where: { userId: user.id } });
  } else if (parsed.data.ids?.length) {
    await db.notification.deleteMany({ where: { userId: user.id, id: { in: parsed.data.ids } } });
  }
  await auditLog({ userId: user.id, action: "notifications.delete", resource: "notifications", ipAddress: getClientIp(request) });
  return success(null, "Notifications deleted.");
});`,

"notifications/read/route.ts": `import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { markNotificationsReadSchema } from "@/lib/validations";
import { auditLog } from "@/lib/logger/audit";
import { db } from "@/lib/db";

export const PATCH = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, markNotificationsReadSchema);
  if ("error" in parsed) return parsed.error;
  if (parsed.data.all) {
    await db.notification.updateMany({ where: { userId: user.id }, data: { read: true } });
  } else if (parsed.data.ids?.length) {
    await db.notification.updateMany({ where: { userId: user.id, id: { in: parsed.data.ids } }, data: { read: true } });
  }
  await auditLog({ userId: user.id, action: "notifications.read", resource: "notifications", ipAddress: getClientIp(request) });
  return success(null, "Notifications marked as read.");
});`,

"reminders/route.ts": `import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { createReminderSchema, updateReminderSchema, deleteReminderSchema } from "@/lib/validations";
import { auditLog } from "@/lib/logger/audit";
import { db } from "@/lib/db";

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, createReminderSchema);
  if ("error" in parsed) return parsed.error;
  const reminder = await db.reminder.create({ data: { ...parsed.data, userId: user.id } });
  await auditLog({ userId: user.id, action: "reminder.create", resource: "reminders", resourceId: reminder.id, ipAddress: getClientIp(request) });
  return success(reminder, "Reminder created.", 201);
});

export const PATCH = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, updateReminderSchema);
  if ("error" in parsed) return parsed.error;
  const existing = await db.reminder.findFirst({ where: { id: parsed.data.id, userId: user.id, deletedAt: null } });
  if (!existing) return notFound("Reminder not found.");
  const { id, ...data } = parsed.data;
  const reminder = await db.reminder.update({ where: { id }, data });
  await auditLog({ userId: user.id, action: "reminder.update", resource: "reminders", resourceId: id, ipAddress: getClientIp(request) });
  return success(reminder, "Reminder updated.");
});

export const DELETE = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, deleteReminderSchema);
  if ("error" in parsed) return parsed.error;
  const existing = await db.reminder.findFirst({ where: { id: parsed.data.id, userId: user.id, deletedAt: null } });
  if (!existing) return notFound("Reminder not found.");
  await db.reminder.update({ where: { id: parsed.data.id }, data: { deletedAt: new Date() } });
  await auditLog({ userId: user.id, action: "reminder.delete", resource: "reminders", resourceId: parsed.data.id, ipAddress: getClientIp(request) });
  return success(null, "Reminder deleted.");
});`,

"admin/users/route.ts": `import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parsePagination } from "@/lib/api/response";
import { paginatedData } from "@/lib/api/helpers";
import { db } from "@/lib/db";

export const GET = withAuth(async (request) => {
  const { page, limit, skip } = parsePagination(request.nextUrl.searchParams);
  const where = { deletedAt: null };
  const [items, total] = await Promise.all([
    db.user.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" }, select: { id: true, email: true, firstName: true, lastName: true, role: true, status: true, lastLogin: true, createdAt: true } }),
    db.user.count({ where }),
  ]);
  return success(paginatedData(items, total, page, limit));
}, "admin.access");`,

"admin/logs/route.ts": `import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parsePagination } from "@/lib/api/response";
import { paginatedData } from "@/lib/api/helpers";
import { db } from "@/lib/db";

export const GET = withAuth(async (request) => {
  const { page, limit, skip } = parsePagination(request.nextUrl.searchParams);
  const [items, total] = await Promise.all([
    db.auditLog.findMany({ skip, take: limit, orderBy: { createdAt: "desc" }, include: { user: { select: { email: true, firstName: true, lastName: true } } } }),
    db.auditLog.count(),
  ]);
  return success(paginatedData(items, total, page, limit));
}, "admin.access");`,

"admin/settings/route.ts": `import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { updateSettingsSchema } from "@/lib/validations";
import { auditLog } from "@/lib/logger/audit";
import { db } from "@/lib/db";

export const GET = withAuth(async () => {
  const settings = await db.systemSetting.findMany();
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  return success(map);
}, "admin.access");

export const PATCH = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, updateSettingsSchema);
  if ("error" in parsed) return parsed.error;
  for (const [key, value] of Object.entries(parsed.data.settings)) {
    await db.systemSetting.upsert({
      where: { key },
      create: { key, value: value as object, updatedBy: user.id },
      update: { value: value as object, updatedBy: user.id },
    });
  }
  await auditLog({ userId: user.id, action: "admin.settings.update", resource: "admin", ipAddress: getClientIp(request) });
  return success(parsed.data.settings, "Settings updated.");
}, "admin.access");`,

"admin/jobs/route.ts": `import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";

const JOBS = ["scrape", "reindex", "embeddings", "report", "backup", "cleanup"];

export const GET = withAuth(async () => {
  return success({ jobs: JOBS.map((name) => ({ name, status: "idle" })) });
}, "admin.access");`,

"admin/jobs/run/route.ts": `import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { runJobSchema } from "@/lib/validations";
import { auditLog, recordEvent } from "@/lib/logger/audit";

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, runJobSchema);
  if ("error" in parsed) return parsed.error;
  await recordEvent({ eventType: \`job.\${parsed.data.job}\`, actorId: user.id, metadata: parsed.data.params, severity: "INFO" });
  await auditLog({ userId: user.id, action: \`job.run.\${parsed.data.job}\`, resource: "jobs", ipAddress: getClientIp(request), metadata: parsed.data.params });
  return success({ job: parsed.data.job, status: "queued" }, \`Job \${parsed.data.job} queued.\`);
}, "admin.access");`,

"jobs/scrape/route.ts": `import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { getClientIp } from "@/lib/api/helpers";
import { auditLog, recordEvent } from "@/lib/logger/audit";

export const POST = withAuth(async (request, { user }) => {
  await recordEvent({ eventType: "job.scrape", actorId: user.id, severity: "INFO" });
  await auditLog({ userId: user.id, action: "job.scrape", resource: "jobs", ipAddress: getClientIp(request) });
  return success({ status: "queued" }, "Scrape job queued.");
}, "admin.access");`,

"jobs/reindex/route.ts": `import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { getClientIp } from "@/lib/api/helpers";
import { auditLog, recordEvent } from "@/lib/logger/audit";

export const POST = withAuth(async (request, { user }) => {
  await recordEvent({ eventType: "job.reindex", actorId: user.id, severity: "INFO" });
  await auditLog({ userId: user.id, action: "job.reindex", resource: "jobs", ipAddress: getClientIp(request) });
  return success({ status: "queued" }, "Reindex job queued.");
}, "admin.access");`,

"jobs/embeddings/route.ts": `import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { getClientIp } from "@/lib/api/helpers";
import { auditLog, recordEvent } from "@/lib/logger/audit";

export const POST = withAuth(async (request, { user }) => {
  await recordEvent({ eventType: "job.embeddings", actorId: user.id, severity: "INFO" });
  await auditLog({ userId: user.id, action: "job.embeddings", resource: "jobs", ipAddress: getClientIp(request) });
  return success({ status: "queued" }, "Embeddings job queued.");
}, "admin.access");`,

"jobs/report/route.ts": `import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { getClientIp } from "@/lib/api/helpers";
import { auditLog, recordEvent } from "@/lib/logger/audit";

export const POST = withAuth(async (request, { user }) => {
  await recordEvent({ eventType: "job.report", actorId: user.id, severity: "INFO" });
  await auditLog({ userId: user.id, action: "job.report", resource: "jobs", ipAddress: getClientIp(request) });
  return success({ status: "queued" }, "Report job queued.");
}, "admin.access");`,

"jobs/backup/route.ts": `import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { getClientIp } from "@/lib/api/helpers";
import { auditLog, recordEvent } from "@/lib/logger/audit";

export const POST = withAuth(async (request, { user }) => {
  await recordEvent({ eventType: "job.backup", actorId: user.id, severity: "INFO" });
  await auditLog({ userId: user.id, action: "job.backup", resource: "jobs", ipAddress: getClientIp(request) });
  return success({ status: "queued" }, "Backup job queued.");
}, "admin.access");`,

"jobs/cleanup/route.ts": `import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { getClientIp } from "@/lib/api/helpers";
import { auditLog, recordEvent } from "@/lib/logger/audit";

export const POST = withAuth(async (request, { user }) => {
  await recordEvent({ eventType: "job.cleanup", actorId: user.id, severity: "INFO" });
  await auditLog({ userId: user.id, action: "job.cleanup", resource: "jobs", ipAddress: getClientIp(request) });
  return success({ status: "queued" }, "Cleanup job queued.");
}, "admin.access");`,
};

console.log(Object.entries(R).map(([p,c]) => w(p,c)).join("\n"));
