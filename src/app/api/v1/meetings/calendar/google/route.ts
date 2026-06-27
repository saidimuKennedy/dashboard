import { withAuth } from "@/lib/api/middleware";
import { error, success } from "@/lib/api/response";
import { buildGoogleAuthUrl, getGoogleCalendarConfig } from "@/lib/meetings/google-calendar";
import { SignJWT } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "jip-dev-secret-change-in-production"
);

export const GET = withAuth(async (_request, { user }) => {
  const { configured } = getGoogleCalendarConfig();
  if (!configured) {
    return error(
      "Google Calendar is not configured. Set GOOGLE_CALENDAR_CLIENT_ID and GOOGLE_CALENDAR_CLIENT_SECRET.",
      "SERVICE_UNAVAILABLE",
      503
    );
  }

  const state = await new SignJWT({ sub: user.id, purpose: "google_calendar" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("10m")
    .sign(JWT_SECRET);

  const url = buildGoogleAuthUrl(state);
  return success({ url });
});
