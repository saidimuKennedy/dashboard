import { NextRequest } from "next/server";
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
  if (!parsed.ok) return parsed.response;
  const article = await knowledgeRepository.create({ ...parsed.data, authorId: user.id });
  await auditLog({ userId: user.id, action: "knowledge.create", resource: "knowledge", resourceId: article.id, ipAddress: getClientIp(request) });
  return success(article, "Knowledge article created.", 201);
}, "knowledge.write");
