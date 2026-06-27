import { NextRequest } from "next/server";
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
  if (!parsed.ok) return parsed.response;
  const article = await knowledgeRepository.update(params!.id, parsed.data, user.id);
  if (!article) return notFound("Article not found.");
  await auditLog({ userId: user.id, action: "knowledge.update", resource: "knowledge", resourceId: params!.id, ipAddress: getClientIp(request) });
  return success(article, "Article updated.");
}, "knowledge.write");

export const DELETE = withAuth(async (request, { user, params }) => {
  await knowledgeRepository.softDelete(params!.id, user.id);
  await auditLog({ userId: user.id, action: "knowledge.delete", resource: "knowledge", resourceId: params!.id, ipAddress: getClientIp(request) });
  return success(null, "Article deleted.");
}, "knowledge.delete");
