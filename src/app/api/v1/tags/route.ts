import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { createTagSchema } from "@/lib/validations";
import { auditLog } from "@/lib/logger/audit";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";

export const GET = withAuth(async () => {
  const items = await db.tag.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } });
  return success({ items });
}, "knowledge.read");

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, createTagSchema);
  if (!parsed.ok) return parsed.response;
  const tag = await db.tag.create({ data: { name: parsed.data.name, slug: slugify(parsed.data.name) } });
  await auditLog({ userId: user.id, action: "tag.create", resource: "tags", resourceId: tag.id, ipAddress: getClientIp(request) });
  return success(tag, "Tag created.", 201);
}, "knowledge.write");
