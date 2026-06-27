import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { updateProfileSchema } from "@/lib/validations";
import { auditLog } from "@/lib/logger/audit";
import { db } from "@/lib/db";

export const GET = withAuth(async (_request, { user }) => {
  const profile = await db.user.findFirst({
    where: { id: user.id, deletedAt: null },
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
  return success(profile);
});

export const PATCH = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, updateProfileSchema);
  if (!parsed.ok) return parsed.response;

  const updated = await db.user.update({ where: { id: user.id }, data: parsed.data });
  await auditLog({
    userId: user.id,
    action: "user.update_profile",
    resource: "users",
    resourceId: user.id,
    ipAddress: getClientIp(request),
  });
  return success(updated, "Profile updated.");
});
