import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { knowledgeEmbedSchema } from "@/lib/validations";
import { knowledgeRepository } from "@/server/repositories/knowledge.repository";
import { auditLog } from "@/lib/logger/audit";
import { db } from "@/lib/db";

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, knowledgeEmbedSchema);
  if (!parsed.ok) return parsed.response;
  const article = await knowledgeRepository.getById(parsed.data.id);
  if (!article) return notFound("Article not found.");
  await db.embedding.upsert({
    where: { entityType_entityId: { entityType: "knowledge", entityId: article.id } },
    create: { entityType: "knowledge", entityId: article.id, content: article.content.slice(0, 8000) },
    update: { content: article.content.slice(0, 8000) },
  });
  await auditLog({ userId: user.id, action: "knowledge.embed", resource: "knowledge", resourceId: article.id, ipAddress: getClientIp(request) });
  return success({ id: article.id, status: "queued" }, "Embedding queued.");
}, "knowledge.write");
