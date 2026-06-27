import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { clearSessionCookie } from "@/lib/auth/session";
import { auditLog } from "@/lib/logger/audit";
import { getClientIp } from "@/lib/api/helpers";

export const POST = withAuth(async (request, { user }) => {
  await clearSessionCookie();
  await auditLog({ userId: user.id, action: "auth.logout", resource: "auth", ipAddress: getClientIp(request) });
  return success(null, "Logged out successfully.");
});
