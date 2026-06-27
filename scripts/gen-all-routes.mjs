import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";

const BASE = "/home/saidimu/Desktop/next/dashboard/src/app/api/v1";

function w(relativePath, content) {
  const fullPath = join(BASE, relativePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content.trimStart() + "\n");
  return fullPath;
}

const routes = {
"auth/login/route.ts": `import { NextRequest } from "next/server";
import { authenticateUser, createToken, setSessionCookie } from "@/lib/auth/session";
import { success, unauthorized } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { loginSchema } from "@/lib/validations";
import { auditLog } from "@/lib/logger/audit";

export async function POST(request: NextRequest) {
  const parsed = await parseBody(request, loginSchema);
  if ("error" in parsed) return parsed.error;
  const user = await authenticateUser(parsed.data.email, parsed.data.password);
  if (!user) return unauthorized("Invalid email or password.");
  const token = await createToken(user);
  await setSessionCookie(token);
  await auditLog({ userId: user.id, action: "auth.login", resource: "auth", ipAddress: getClientIp(request) });
  return success({ user, token }, "Login successful.");
}`,

"auth/logout/route.ts": `import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { clearSessionCookie } from "@/lib/auth/session";
import { auditLog } from "@/lib/logger/audit";
import { getClientIp } from "@/lib/api/helpers";

export const POST = withAuth(async (request, { user }) => {
  await clearSessionCookie();
  await auditLog({ userId: user.id, action: "auth.logout", resource: "auth", ipAddress: getClientIp(request) });
  return success(null, "Logged out successfully.");
});`,

"auth/refresh/route.ts": `import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { createToken, setSessionCookie } from "@/lib/auth/session";

export const POST = withAuth(async (_request, { user }) => {
  const token = await createToken(user);
  await setSessionCookie(token);
  return success({ user, token }, "Session refreshed.");
});`,

"auth/me/route.ts": `import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { db } from "@/lib/db";

export const GET = withAuth(async (_request, { user }) => {
  const profile = await db.user.findFirst({
    where: { id: user.id, deletedAt: null },
    select: { id: true, email: true, firstName: true, lastName: true, avatar: true, role: true, status: true, lastLogin: true, createdAt: true },
  });
  return success(profile);
});`,

"auth/change-password/route.ts": `import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, error } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { changePasswordSchema } from "@/lib/validations";
import { hashPassword, verifyPassword } from "@/lib/auth/session";
import { auditLog } from "@/lib/logger/audit";
import { db } from "@/lib/db";

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, changePasswordSchema);
  if ("error" in parsed) return parsed.error;
  const record = await db.user.findUnique({ where: { id: user.id } });
  if (!record) return error("User not found.", "NOT_FOUND", 404);
  const valid = await verifyPassword(parsed.data.currentPassword, record.passwordHash);
  if (!valid) return error("Current password is incorrect.", "INVALID_PASSWORD", 400);
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(parsed.data.newPassword) } });
  await auditLog({ userId: user.id, action: "auth.change_password", resource: "auth", ipAddress: getClientIp(request) });
  return success(null, "Password changed successfully.");
});`,

"dashboard/route.ts": `import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { dashboardRepository } from "@/server/repositories/dashboard.repository";

export const GET = withAuth(async () => {
  const data = await dashboardRepository.getOverview();
  return success(data);
});`,

"dashboard/widgets/route.ts": `import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { db } from "@/lib/db";

const DEFAULT_WIDGETS = [
  { id: "revenue", type: "revenue", x: 0, y: 0, w: 6, h: 2 },
  { id: "compliance", type: "compliance", x: 6, y: 0, w: 6, h: 2 },
  { id: "tasks", type: "tasks", x: 0, y: 2, w: 4, h: 2 },
  { id: "ai-brief", type: "ai-brief", x: 4, y: 2, w: 8, h: 2 },
];

export const GET = withAuth(async (_request, { user }) => {
  const layout = await db.dashboardLayout.findUnique({ where: { userId: user.id } });
  return success({ widgets: layout?.widgets ?? DEFAULT_WIDGETS });
});`,

"dashboard/layout/route.ts": `import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { updateLayoutSchema } from "@/lib/validations";
import { auditLog } from "@/lib/logger/audit";
import { db } from "@/lib/db";

export const PATCH = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, updateLayoutSchema);
  if ("error" in parsed) return parsed.error;
  const layout = await db.dashboardLayout.upsert({
    where: { userId: user.id },
    create: { userId: user.id, widgets: parsed.data.widgets },
    update: { widgets: parsed.data.widgets },
  });
  await auditLog({ userId: user.id, action: "dashboard.update_layout", resource: "dashboard", ipAddress: getClientIp(request) });
  return success(layout, "Dashboard layout updated.");
});`,

"knowledge/route.ts": `import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody, getClientIp, paginatedData } from "@/lib/api/helpers";
import { parsePagination } from "@/lib/api/response";
import { createKnowledgeSchema } from "@/lib/validations";
import { knowledgeRepository } from "@/server/repositories/knowledge.repository";
import { auditLog } from "@/lib/logger/audit";
import { ArticleStatus } from "@prisma/client";

export const GET = withAuth(async (request) => {
  const { page, limit, skip } = parsePagination(request.nextUrl.searchParams);
  const status = request.nextUrl.searchParams.get("status") as ArticleStatus | null;
  const categoryId = request.nextUrl.searchParams.get("category") ?? undefined;
  const search = request.nextUrl.searchParams.get("search") ?? undefined;
  const { items, total } = await knowledgeRepository.list({ skip, take: limit, status: status ?? undefined, categoryId, search });
  return success(paginatedData(items, total, page, limit));
}, "knowledge.read");

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, createKnowledgeSchema);
  if ("error" in parsed) return parsed.error;
  const article = await knowledgeRepository.create({ ...parsed.data, authorId: user.id });
  await auditLog({ userId: user.id, action: "knowledge.create", resource: "knowledge", resourceId: article.id, ipAddress: getClientIp(request) });
  return success(article, "Knowledge article created.", 201);
}, "knowledge.write");`,

"knowledge/[id]/route.ts": `import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { updateKnowledgeSchema } from "@/lib/validations";
import { knowledgeRepository } from "@/server/repositories/knowledge.repository";
import { auditLog } from "@/lib/logger/audit";

export const GET = withAuth(async (_request, { params }) => {
  const article = await knowledgeRepository.getById(params!.id);
  if (!article) return notFound("Article not found.");
  return success(article);
}, "knowledge.read");

export const PATCH = withAuth(async (request, { user, params }) => {
  const parsed = await parseBody(request, updateKnowledgeSchema);
  if ("error" in parsed) return parsed.error;
  const article = await knowledgeRepository.update(params!.id, parsed.data, user.id);
  if (!article) return notFound("Article not found.");
  await auditLog({ userId: user.id, action: "knowledge.update", resource: "knowledge", resourceId: params!.id, ipAddress: getClientIp(request) });
  return success(article, "Article updated.");
}, "knowledge.write");

export const DELETE = withAuth(async (request, { user, params }) => {
  await knowledgeRepository.softDelete(params!.id, user.id);
  await auditLog({ userId: user.id, action: "knowledge.delete", resource: "knowledge", resourceId: params!.id, ipAddress: getClientIp(request) });
  return success(null, "Article deleted.");
}, "knowledge.delete");`,

"knowledge/search/route.ts": `import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody } from "@/lib/api/helpers";
import { knowledgeSearchSchema } from "@/lib/validations";
import { knowledgeRepository } from "@/server/repositories/knowledge.repository";

export const POST = withAuth(async (request) => {
  const parsed = await parseBody(request, knowledgeSearchSchema);
  if ("error" in parsed) return parsed.error;
  const results = await knowledgeRepository.search(parsed.data.query, parsed.data.limit ?? 20);
  return success({ results });
}, "knowledge.read");`,

"knowledge/summarize/route.ts": `import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody } from "@/lib/api/helpers";
import { knowledgeSummarizeSchema } from "@/lib/validations";
import { knowledgeRepository } from "@/server/repositories/knowledge.repository";
import { aiService } from "@/server/ai/ai.service";

export const POST = withAuth(async (request) => {
  const parsed = await parseBody(request, knowledgeSummarizeSchema);
  if ("error" in parsed) return parsed.error;
  let content = parsed.data.content;
  if (parsed.data.id) {
    const article = await knowledgeRepository.getById(parsed.data.id);
    if (!article) return notFound("Article not found.");
    content = article.content;
  }
  const result = await aiService.summarize(content!, "knowledge");
  return success(result);
}, "ai.use");`,

"knowledge/embed/route.ts": `import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { knowledgeEmbedSchema } from "@/lib/validations";
import { knowledgeRepository } from "@/server/repositories/knowledge.repository";
import { auditLog } from "@/lib/logger/audit";
import { db } from "@/lib/db";

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, knowledgeEmbedSchema);
  if ("error" in parsed) return parsed.error;
  const article = await knowledgeRepository.getById(parsed.data.id);
  if (!article) return notFound("Article not found.");
  await db.embedding.upsert({
    where: { entityType_entityId: { entityType: "knowledge", entityId: article.id } },
    create: { entityType: "knowledge", entityId: article.id, content: article.content.slice(0, 8000) },
    update: { content: article.content.slice(0, 8000) },
  });
  await auditLog({ userId: user.id, action: "knowledge.embed", resource: "knowledge", resourceId: article.id, ipAddress: getClientIp(request) });
  return success({ id: article.id, status: "queued" }, "Embedding queued.");
}, "knowledge.write");`,

"knowledge/related/route.ts": `import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { knowledgeRelatedSchema } from "@/lib/validations";
import { db } from "@/lib/db";

export const GET = withAuth(async (request) => {
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = knowledgeRelatedSchema.safeParse(params);
  if (!parsed.success) return success({ items: [] });
  const limit = parsed.data.limit ?? 5;
  const items = await db.knowledgeArticle.findMany({
    where: {
      deletedAt: null,
      ...(parsed.data.id && { id: { not: parsed.data.id } }),
      ...(parsed.data.categoryId && { categoryId: parsed.data.categoryId }),
    },
    take: limit,
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, slug: true, summary: true, status: true },
  });
  return success({ items });
}, "knowledge.read");`,
};

const created = Object.entries(routes).map(([p, c]) => w(p, c));
console.log(created.length, "files");
console.log(created.join("\n"));
