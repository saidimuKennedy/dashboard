import { db } from "@/lib/db";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

const SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"];

export function getGoogleCalendarConfig() {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return { clientId, clientSecret, appUrl, configured: Boolean(clientId && clientSecret) };
}

export function buildGoogleAuthUrl(state: string) {
  const { clientId, appUrl, configured } = getGoogleCalendarConfig();
  if (!configured || !clientId) {
    throw new Error("Google Calendar is not configured.");
  }

  const redirectUri = `${appUrl}/api/v1/meetings/calendar/google/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export async function exchangeGoogleCode(code: string) {
  const { clientId, clientSecret, appUrl } = getGoogleCalendarConfig();
  if (!clientId || !clientSecret) throw new Error("Google Calendar is not configured.");

  const redirectUri = `${appUrl}/api/v1/meetings/calendar/google/callback`;
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    throw new Error(`Google token exchange failed: ${response.statusText}`);
  }

  return response.json() as Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  }>;
}

export async function refreshGoogleToken(refreshToken: string) {
  const { clientId, clientSecret } = getGoogleCalendarConfig();
  if (!clientId || !clientSecret) throw new Error("Google Calendar is not configured.");

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error(`Google token refresh failed: ${response.statusText}`);
  }

  return response.json() as Promise<{
    access_token: string;
    expires_in?: number;
  }>;
}

export async function fetchGoogleCalendarEvents(accessToken: string, timeMin?: Date) {
  const params = new URLSearchParams({
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "50",
    timeMin: (timeMin ?? new Date()).toISOString(),
  });

  const response = await fetch(`${GOOGLE_EVENTS_URL}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Google Calendar fetch failed: ${response.statusText}`);
  }

  const data = (await response.json()) as {
    items?: Array<{
      id: string;
      summary?: string;
      description?: string;
      location?: string;
      status?: string;
      start?: { dateTime?: string; date?: string };
      end?: { dateTime?: string; date?: string };
      attendees?: Array<{ displayName?: string; email?: string }>;
    }>;
  };

  return (data.items ?? []).map((item) => ({
    id: item.id,
    title: item.summary ?? "Untitled meeting",
    description: item.description,
    location: item.location,
    start: new Date(item.start?.dateTime ?? item.start?.date ?? new Date()),
    end: item.end?.dateTime
      ? new Date(item.end.dateTime)
      : item.end?.date
        ? new Date(item.end.date)
        : undefined,
    status:
      item.status === "cancelled"
        ? ("cancelled" as const)
        : item.status === "tentative"
          ? ("tentative" as const)
          : ("confirmed" as const),
    attendees: item.attendees?.map((a) => ({
      name: a.displayName,
      email: a.email,
    })),
    source: "google_calendar" as const,
  }));
}

export async function getGoogleAccessToken(userId: string) {
  const connection = await db.calendarConnection.findUnique({
    where: { userId_provider: { userId, provider: "GOOGLE" } },
  });

  if (!connection) return null;

  if (connection.expiresAt && connection.expiresAt.getTime() > Date.now() + 60_000) {
    return connection.accessToken;
  }

  if (!connection.refreshToken) return connection.accessToken;

  const refreshed = await refreshGoogleToken(connection.refreshToken);
  const expiresAt = refreshed.expires_in
    ? new Date(Date.now() + refreshed.expires_in * 1000)
    : null;

  await db.calendarConnection.update({
    where: { id: connection.id },
    data: { accessToken: refreshed.access_token, expiresAt },
  });

  return refreshed.access_token;
}

export async function upsertGoogleConnection(
  userId: string,
  tokens: { access_token: string; refresh_token?: string; expires_in?: number }
) {
  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000)
    : null;

  return db.calendarConnection.upsert({
    where: { userId_provider: { userId, provider: "GOOGLE" } },
    create: {
      userId,
      provider: "GOOGLE",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt,
      calendarId: "primary",
    },
    update: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? undefined,
      expiresAt,
    },
  });
}
