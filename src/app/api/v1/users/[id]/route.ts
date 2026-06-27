import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { updateUserSchema } from "@/lib/validations";
import { auditLog } from "@/lib/logger/audit";
import { db } from "@/lib/db";

export const GET = withAuth(async (_request, { params }) => {
  const user = await db.user.findFirst({
    where: { id: params?.id, deletedAt: null },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      avatar: true,
      role: true,
      status: true,
      lastLogin: true,
      createdAt: true,
    },
  });
  if (!user) return notFound("User not found.");
  return success(user);
}, "admin.access");

export const PATCH = withAuth(async (request, { user, params }) => {
  const parsed = await parseBody(request, updateUserSchema);
  if (!parsed.ok) return parsed.response;

  const existing = await db.user.findFirst({ where: { id: params?.id, deletedAt: null } });
  if (!existing) return notFound("User not found.");

  const updated = await db.user.update({ where: { id: params!.id }, data: parsed.data });
  await auditLog({
    userId: user.id,
    action: "user.update",
    resource: "users",
    resourceId: updated.id,
    ipAddress: getClientIp(request),
  });
  return success(updated, "User updated.");
}, "admin.access");

export const DELETE = withAuth(async (request, { user, params }) => {
  const existing = await db.user.findFirst({ where: { id: params?.id, deletedAt: null } });
  if (!existing) return notFound("User not found.");

  await db.user.update({ where: { id: params!.id }, data: { deletedAt: new Date() } });
  await auditLog({
    userId: user.id,
    action: "user.delete",
    resource: "users",
    resourceId: params!.id,
    ipAddress: getClientIp(request),
  });
  return success(null, "User deleted.");
}, "admin.access");
