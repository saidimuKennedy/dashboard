import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { createCategorySchema } from "@/lib/validations";
import { auditLog } from "@/lib/logger/audit";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";

export const GET = withAuth(async () => {
  const items = await db.knowledgeCategory.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } });
  return success({ items });
}, "knowledge.read");

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, createCategorySchema);
  if (!parsed.ok) return parsed.response;
  const category = await db.knowledgeCategory.create({ data: { ...parsed.data, slug: slugify(parsed.data.name), createdBy: user.id } });
  await auditLog({ userId: user.id, action: "category.create", resource: "categories", resourceId: category.id, ipAddress: getClientIp(request) });
  return success(category, "Category created.", 201);
}, "knowledge.write");
