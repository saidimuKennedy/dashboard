import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody, getClientIp, paginatedData } from "@/lib/api/helpers";
import { parsePagination } from "@/lib/api/response";
import { createMeetingSchema } from "@/lib/validations";
import { meetingRepository } from "@/server/repositories/domains.repository";
import { auditLog } from "@/lib/logger/audit";

export const GET = withAuth(async (request) => {
  const { page, limit, skip } = parsePagination(request.nextUrl.searchParams);
  const { items, total } = await meetingRepository.list(skip, limit);
  return success(paginatedData(items, total, page, limit));
});

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, createMeetingSchema);
  if (!parsed.ok) return parsed.response;
  const meeting = await meetingRepository.create({ ...parsed.data, creatorId: user.id });
  await auditLog({ userId: user.id, action: "meeting.create", resource: "meetings", resourceId: meeting.id, ipAddress: getClientIp(request) });
  return success(meeting, "Meeting created.", 201);
});
