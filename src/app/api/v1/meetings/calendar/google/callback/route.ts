import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import {
  exchangeGoogleCode,
  fetchGoogleCalendarEvents,
  upsertGoogleConnection,
} from "@/lib/meetings/google-calendar";
import { meetingRepository } from "@/server/repositories/domains.repository";
import { db } from "@/lib/db";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "jip-dev-secret-change-in-production"
);

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/meetings?calendar=error`);
  }

  try {
    const { payload } = await jwtVerify(state, JWT_SECRET);
    const userId = payload.sub as string;
    if (!userId || payload.purpose !== "google_calendar") {
      return NextResponse.redirect(`${appUrl}/meetings?calendar=error`);
    }

    const tokens = await exchangeGoogleCode(code);
    await upsertGoogleConnection(userId, tokens);

    const events = await fetchGoogleCalendarEvents(tokens.access_token);
    const result = await meetingRepository.importCalendarEvents(events, userId);

    await db.calendarConnection.update({
      where: { userId_provider: { userId, provider: "GOOGLE" } },
      data: { lastSyncedAt: new Date() },
    });

    return NextResponse.redirect(
      `${appUrl}/meetings?calendar=synced&imported=${result.created + result.updated}`
    );
  } catch {
    return NextResponse.redirect(`${appUrl}/meetings?calendar=error`);
  }
}
