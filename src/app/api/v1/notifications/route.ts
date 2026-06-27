import { NextRequest } from "next/server";
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
  if (!parsed.ok) return parsed.response;
  if (parsed.data.all) {
    await db.notification.deleteMany({ where: { userId: user.id } });
  } else if (parsed.data.ids?.length) {
    await db.notification.deleteMany({ where: { userId: user.id, id: { in: parsed.data.ids } } });
  }
  await auditLog({ userId: user.id, action: "notifications.delete", resource: "notifications", ipAddress: getClientIp(request) });
  return success(null, "Notifications deleted.");
});
