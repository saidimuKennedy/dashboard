import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, error } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { changePasswordSchema } from "@/lib/validations";
import { hashPassword, verifyPassword } from "@/lib/auth/session";
import { auditLog } from "@/lib/logger/audit";
import { db } from "@/lib/db";

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, changePasswordSchema);
  if (!parsed.ok) return parsed.response;
  const record = await db.user.findUnique({ where: { id: user.id } });
  if (!record) return error("User not found.", "NOT_FOUND", 404);
  const valid = await verifyPassword(parsed.data.currentPassword, record.passwordHash);
  if (!valid) return error("Current password is incorrect.", "INVALID_PASSWORD", 400);
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(parsed.data.newPassword) } });
  await auditLog({ userId: user.id, action: "auth.change_password", resource: "auth", ipAddress: getClientIp(request) });
  return success(null, "Password changed successfully.");
});
