import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { updateLayoutSchema } from "@/lib/validations";
import { auditLog } from "@/lib/logger/audit";
import { db } from "@/lib/db";

export const PATCH = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, updateLayoutSchema);
  if (!parsed.ok) return parsed.response;
  const layout = await db.dashboardLayout.upsert({
    where: { userId: user.id },
    create: { userId: user.id, widgets: parsed.data.widgets },
    update: { widgets: parsed.data.widgets },
  });
  await auditLog({ userId: user.id, action: "dashboard.update_layout", resource: "dashboard", ipAddress: getClientIp(request) });
  return success(layout, "Dashboard layout updated.");
});
