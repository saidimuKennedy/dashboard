import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { updateSettingsSchema } from "@/lib/validations";
import { auditLog } from "@/lib/logger/audit";
import { db } from "@/lib/db";

export const GET = withAuth(async () => {
  const settings = await db.systemSetting.findMany();
  const map = Object.fromEntries(settings.map((s: { key: string; value: unknown }) => [s.key, s.value]));
  return success(map);
}, "admin.access");

export const PATCH = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, updateSettingsSchema);
  if (!parsed.ok) return parsed.response;
  for (const [key, value] of Object.entries(parsed.data.settings)) {
    await db.systemSetting.upsert({
      where: { key },
      create: { key, value: value as object, updatedBy: user.id },
      update: { value: value as object, updatedBy: user.id },
    });
  }
  await auditLog({ userId: user.id, action: "admin.settings.update", resource: "admin", ipAddress: getClientIp(request) });
  return success(parsed.data.settings, "Settings updated.");
}, "admin.access");
