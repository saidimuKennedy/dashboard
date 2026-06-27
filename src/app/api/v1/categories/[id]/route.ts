import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { updateCategorySchema } from "@/lib/validations";
import { auditLog } from "@/lib/logger/audit";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";

export const PATCH = withAuth(async (request, { user, params }) => {
  const parsed = await parseBody(request, updateCategorySchema);
  if (!parsed.ok) return parsed.response;
  const existing = await db.knowledgeCategory.findFirst({ where: { id: params!.id, deletedAt: null } });
  if (!existing) return notFound("Category not found.");
  const category = await db.knowledgeCategory.update({
    where: { id: params!.id },
    data: { ...parsed.data, ...(parsed.data.name && { slug: slugify(parsed.data.name) }), updatedBy: user.id },
  });
  await auditLog({ userId: user.id, action: "category.update", resource: "categories", resourceId: category.id, ipAddress: getClientIp(request) });
  return success(category, "Category updated.");
}, "knowledge.write");

export const DELETE = withAuth(async (request, { user, params }) => {
  const existing = await db.knowledgeCategory.findFirst({ where: { id: params!.id, deletedAt: null } });
  if (!existing) return notFound("Category not found.");
  await db.knowledgeCategory.update({ where: { id: params!.id }, data: { deletedAt: new Date(), updatedBy: user.id } });
  await auditLog({ userId: user.id, action: "category.delete", resource: "categories", resourceId: params!.id, ipAddress: getClientIp(request) });
  return success(null, "Category deleted.");
}, "knowledge.delete");
