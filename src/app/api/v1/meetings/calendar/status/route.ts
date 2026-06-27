import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { db } from "@/lib/db";
import { getGoogleCalendarConfig } from "@/lib/meetings/google-calendar";

export const GET = withAuth(async (_request, { user }) => {
  const { configured } = getGoogleCalendarConfig();
  const connection = await db.calendarConnection.findUnique({
    where: { userId_provider: { userId: user.id, provider: "GOOGLE" } },
    select: { id: true, lastSyncedAt: true, expiresAt: true, createdAt: true },
  });

  return success({
    google: {
      configured,
      connected: Boolean(connection),
      lastSyncedAt: connection?.lastSyncedAt ?? null,
    },
  });
});
