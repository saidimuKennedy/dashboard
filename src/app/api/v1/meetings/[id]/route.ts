import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { updateMeetingSchema } from "@/lib/validations";
import { meetingRepository } from "@/server/repositories/domains.repository";
import { auditLog } from "@/lib/logger/audit";

export const PATCH = withAuth(async (request, { user, params }) => {
  const parsed = await parseBody(request, updateMeetingSchema);
  if (!parsed.ok) return parsed.response;
  const existing = await meetingRepository.getById(params!.id);
  if (!existing) return notFound("Meeting not found.");
  const meeting = await meetingRepository.update(params!.id, parsed.data, user.id);
  await auditLog({ userId: user.id, action: "meeting.update", resource: "meetings", resourceId: params!.id, ipAddress: getClientIp(request) });
  return success(meeting, "Meeting updated.");
});

export const DELETE = withAuth(async (request, { user, params }) => {
  const existing = await meetingRepository.getById(params!.id);
  if (!existing) return notFound("Meeting not found.");
  await meetingRepository.softDelete(params!.id, user.id);
  await auditLog({ userId: user.id, action: "meeting.delete", resource: "meetings", resourceId: params!.id, ipAddress: getClientIp(request) });
  return success(null, "Meeting deleted.");
});
