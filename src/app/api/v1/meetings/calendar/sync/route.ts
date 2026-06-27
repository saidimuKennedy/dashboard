import { withAuth } from "@/lib/api/middleware";
import { error, success } from "@/lib/api/response";
import {
  fetchGoogleCalendarEvents,
  getGoogleAccessToken,
} from "@/lib/meetings/google-calendar";
import { meetingRepository } from "@/server/repositories/domains.repository";
import { db } from "@/lib/db";

export const POST = withAuth(async (_request, { user }) => {
  const accessToken = await getGoogleAccessToken(user.id);
  if (!accessToken) {
    return error("Google Calendar is not connected.", "BAD_REQUEST", 400);
  }

  const events = await fetchGoogleCalendarEvents(accessToken);
  const result = await meetingRepository.importCalendarEvents(events, user.id);

  await db.calendarConnection.update({
    where: { userId_provider: { userId: user.id, provider: "GOOGLE" } },
    data: { lastSyncedAt: new Date() },
  });

  return success(result, `Synced ${result.created + result.updated} meeting(s) from Google Calendar.`);
});
