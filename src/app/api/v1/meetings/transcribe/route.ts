import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { meetingTranscribeSchema } from "@/lib/validations";
import { meetingRepository } from "@/server/repositories/domains.repository";
import { auditLog } from "@/lib/logger/audit";

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, meetingTranscribeSchema);
  if (!parsed.ok) return parsed.response;
  const meeting = await meetingRepository.getById(parsed.data.meetingId);
  if (!meeting) return notFound("Meeting not found.");
  const transcript = parsed.data.transcript ?? "[Transcription stub — audio processing not configured]";
  const updated = await meetingRepository.update(parsed.data.meetingId, { transcript }, user.id);
  await auditLog({ userId: user.id, action: "meeting.transcribe", resource: "meetings", resourceId: parsed.data.meetingId, ipAddress: getClientIp(request) });
  return success(updated, "Meeting transcribed.");
});
