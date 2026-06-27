import type { MeetingType } from "@prisma/client";
import type { z } from "zod";
import type { calendarEventImportSchema } from "@/lib/validations/meeting";

export type CalendarEventInput = z.infer<typeof calendarEventImportSchema>;

const URL_PATTERN =
  /https?:\/\/(?:[\w-]+\.)?(?:zoom\.us|meet\.google\.com|teams\.microsoft\.com|webex\.com)[^\s<>"']*/gi;

export function extractMeetingUrl(...parts: (string | null | undefined)[]): string | null {
  for (const part of parts) {
    if (!part) continue;
    const match = part.match(URL_PATTERN);
    if (match?.[0]) return match[0].replace(/[.,;)]+$/, "");
  }
  return null;
}

export function inferMeetingType(
  meetingUrl: string | null,
  location: string | null | undefined
): MeetingType {
  if (meetingUrl && location?.trim()) return "HYBRID";
  if (meetingUrl) return "VIRTUAL";
  return "IN_PERSON";
}

export function mapCalendarEventToMeeting(
  event: CalendarEventInput,
  creatorId: string
) {
  const meetingUrl = extractMeetingUrl(event.location, event.description);
  const location =
    event.location && !event.location.match(URL_PATTERN) ? event.location : null;
  const endsAt = event.end ?? new Date(event.start.getTime() + 60 * 60 * 1000);
  const durationMinutes = Math.round((endsAt.getTime() - event.start.getTime()) / 60000);

  return {
    title: event.title,
    agenda: event.description ?? undefined,
    scheduledAt: event.start,
    endsAt,
    durationMinutes: durationMinutes > 0 ? durationMinutes : 60,
    type: inferMeetingType(meetingUrl, location),
    status: event.status === "cancelled" ? ("CANCELLED" as const) : ("SCHEDULED" as const),
    meetingUrl: meetingUrl ?? undefined,
    location: location ?? undefined,
    externalSource: event.source,
    externalId: event.id,
    externalParticipants:
      event.attendees
        ?.filter((a) => a.name || a.email)
        .map((a) => ({ name: a.name ?? a.email ?? "Guest", email: a.email })) ?? [],
    creatorId,
    createdBy: creatorId,
  };
}

export function parseIcsEvents(ics: string): CalendarEventInput[] {
  const events: CalendarEventInput[] = [];
  const blocks = ics.split("BEGIN:VEVENT");

  for (const block of blocks.slice(1)) {
    const uid = readIcsField(block, "UID");
    const summary = readIcsField(block, "SUMMARY");
    const dtStart = readIcsField(block, "DTSTART");
    if (!uid || !summary || !dtStart) continue;

    const dtEnd = readIcsField(block, "DTEND");
    const description = readIcsField(block, "DESCRIPTION");
    const location = readIcsField(block, "LOCATION");
    const status = readIcsField(block, "STATUS")?.toLowerCase();

    events.push({
      id: uid,
      title: summary.replace(/\\n/g, " ").replace(/\\,/g, ","),
      description: description?.replace(/\\n/g, "\n"),
      location: location?.replace(/\\,/g, ","),
      start: parseIcsDate(dtStart),
      end: dtEnd ? parseIcsDate(dtEnd) : undefined,
      status:
        status === "cancelled"
          ? "cancelled"
          : status === "tentative"
            ? "tentative"
            : "confirmed",
      source: "manual",
    });
  }

  return events;
}

function readIcsField(block: string, key: string): string | undefined {
  const match = block.match(new RegExp(`^${key}[^:]*:(.+)$`, "m"));
  return match?.[1]?.trim();
}

function parseIcsDate(value: string): Date {
  if (value.endsWith("Z")) {
    const y = value.slice(0, 4);
    const mo = value.slice(4, 6);
    const d = value.slice(6, 8);
    const h = value.slice(9, 11);
    const mi = value.slice(11, 13);
    const s = value.slice(13, 15);
    return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}Z`);
  }
  const y = value.slice(0, 4);
  const mo = value.slice(4, 6);
  const d = value.slice(6, 8);
  const h = value.slice(9, 11) || "00";
  const mi = value.slice(11, 13) || "00";
  const s = value.slice(13, 15) || "00";
  return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}`);
}
