import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { updateTagSchema } from "@/lib/validations";
import { auditLog } from "@/lib/logger/audit";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";

export const PATCH = withAuth(async (request, { user, params }) => {
  const parsed = await parseBody(request, updateTagSchema);
  if (!parsed.ok) return parsed.response;
  const existing = await db.tag.findFirst({ where: { id: params!.id, deletedAt: null } });
  if (!existing) return notFound("Tag not found.");
  const tag = await db.tag.update({ where: { id: params!.id }, data: { ...parsed.data, ...(parsed.data.name && { slug: slugify(parsed.data.name) }) } });
  await auditLog({ userId: user.id, action: "tag.update", resource: "tags", resourceId: tag.id, ipAddress: getClientIp(request) });
  return success(tag, "Tag updated.");
}, "knowledge.write");

export const DELETE = withAuth(async (request, { user, params }) => {
  const existing = await db.tag.findFirst({ where: { id: params!.id, deletedAt: null } });
  if (!existing) return notFound("Tag not found.");
  await db.tag.update({ where: { id: params!.id }, data: { deletedAt: new Date() } });
  await auditLog({ userId: user.id, action: "tag.delete", resource: "tags", resourceId: params!.id, ipAddress: getClientIp(request) });
  return success(null, "Tag deleted.");
}, "knowledge.delete");
