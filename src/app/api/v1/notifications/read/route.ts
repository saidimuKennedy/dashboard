import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { markNotificationsReadSchema } from "@/lib/validations";
import { auditLog } from "@/lib/logger/audit";
import { db } from "@/lib/db";

export const PATCH = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, markNotificationsReadSchema);
  if (!parsed.ok) return parsed.response;
  if (parsed.data.all) {
    await db.notification.updateMany({ where: { userId: user.id }, data: { read: true } });
  } else if (parsed.data.ids?.length) {
    await db.notification.updateMany({ where: { userId: user.id, id: { in: parsed.data.ids } }, data: { read: true } });
  }
  await auditLog({ userId: user.id, action: "notifications.read", resource: "notifications", ipAddress: getClientIp(request) });
  return success(null, "Notifications marked as read.");
});
