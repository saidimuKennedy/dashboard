import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { createReminderSchema, updateReminderSchema, deleteReminderSchema } from "@/lib/validations";
import { auditLog } from "@/lib/logger/audit";
import { db } from "@/lib/db";

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, createReminderSchema);
  if (!parsed.ok) return parsed.response;
  const reminder = await db.reminder.create({ data: { ...parsed.data, userId: user.id } });
  await auditLog({ userId: user.id, action: "reminder.create", resource: "reminders", resourceId: reminder.id, ipAddress: getClientIp(request) });
  return success(reminder, "Reminder created.", 201);
});

export const PATCH = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, updateReminderSchema);
  if (!parsed.ok) return parsed.response;
  const existing = await db.reminder.findFirst({ where: { id: parsed.data.id, userId: user.id, deletedAt: null } });
  if (!existing) return notFound("Reminder not found.");
  const { id, ...data } = parsed.data;
  const reminder = await db.reminder.update({ where: { id }, data });
  await auditLog({ userId: user.id, action: "reminder.update", resource: "reminders", resourceId: id, ipAddress: getClientIp(request) });
  return success(reminder, "Reminder updated.");
});

export const DELETE = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, deleteReminderSchema);
  if (!parsed.ok) return parsed.response;
  const existing = await db.reminder.findFirst({ where: { id: parsed.data.id, userId: user.id, deletedAt: null } });
  if (!existing) return notFound("Reminder not found.");
  await db.reminder.update({ where: { id: parsed.data.id }, data: { deletedAt: new Date() } });
  await auditLog({ userId: user.id, action: "reminder.delete", resource: "reminders", resourceId: parsed.data.id, ipAddress: getClientIp(request) });
  return success(null, "Reminder deleted.");
});
