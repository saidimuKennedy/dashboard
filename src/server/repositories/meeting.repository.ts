import { db } from "@/lib/db";
import { mapCalendarEventToMeeting } from "@/lib/meetings/calendar-import";
import type { CalendarEventInput } from "@/lib/meetings/calendar-import";
import { syncMeetingReminders } from "@/lib/meetings/reminders";
import { scheduleRagIndex, scheduleRagRemove } from "@/server/ai/rag/indexer.service";
import { Prisma, type MeetingOutcome, type MeetingStatus, type MeetingType } from "@prisma/client";

export type MeetingCreateInput = {
  title: string;
  agenda?: string;
  minutes?: string;
  creatorId: string;
  customerId?: string;
  scheduledAt?: Date;
  endsAt?: Date;
  durationMinutes?: number;
  type?: MeetingType;
  status?: MeetingStatus;
  meetingUrl?: string;
  location?: string;
  outcomeReport?: string;
  externalSource?: string;
  externalId?: string;
  externalParticipants?: Prisma.InputJsonValue;
  createdBy?: string;
};

export type MeetingUpdateInput = Partial<{
  title: string;
  agenda: string | null;
  minutes: string | null;
  transcript: string | null;
  aiSummary: string | null;
  aiEvaluation: string | null;
  scheduledAt: Date | null;
  endsAt: Date | null;
  durationMinutes: number | null;
  type: MeetingType;
  status: MeetingStatus;
  outcome: MeetingOutcome;
  meetingUrl: string | null;
  location: string | null;
  outcomeReport: string | null;
  customerId: string | null;
  externalParticipants: Prisma.InputJsonValue | null;
}>;

const meetingInclude = {
  creator: { select: { id: true, firstName: true, lastName: true } },
  customer: { select: { id: true, name: true } },
  actionItems: { where: { deletedAt: null }, orderBy: { createdAt: "asc" as const } },
};

const meetingDetailInclude = {
  creator: true,
  customer: true,
  participants: { include: { user: true } },
  actionItems: { where: { deletedAt: null }, orderBy: { createdAt: "asc" as const } },
};

function normalizeUrl(url?: string | null) {
  if (!url) return undefined;
  const trimmed = url.trim();
  return trimmed || undefined;
}

export const meetingRepository = {
  async list(skip: number, take: number) {
    const where = { deletedAt: null };
    const [items, total] = await Promise.all([
      db.meeting.findMany({
        where,
        skip,
        take,
        orderBy: [{ scheduledAt: "desc" }, { createdAt: "desc" }],
        include: meetingInclude,
      }),
      db.meeting.count({ where }),
    ]);
    return { items, total };
  },

  async listUpcoming(take = 10) {
    return db.meeting.findMany({
      where: {
        deletedAt: null,
        status: "SCHEDULED",
        scheduledAt: { gte: new Date() },
      },
      take,
      orderBy: { scheduledAt: "asc" },
      include: meetingInclude,
    });
  },

  async getById(id: string) {
    return db.meeting.findFirst({
      where: { id, deletedAt: null },
      include: meetingDetailInclude,
    });
  },

  async create(data: MeetingCreateInput) {
    const meeting = await db.meeting.create({
      data: {
        ...data,
        meetingUrl: normalizeUrl(data.meetingUrl),
        createdBy: data.createdBy ?? data.creatorId,
      },
      include: meetingDetailInclude,
    });

    await syncMeetingReminders(
      meeting.id,
      data.creatorId,
      meeting.title,
      meeting.scheduledAt,
      meeting.status
    );

    scheduleRagIndex("meeting", meeting.id);
    return meeting;
  },

  async update(id: string, data: MeetingUpdateInput, userId: string) {
    const { customerId, externalParticipants, ...rest } = data;
    const payload: Prisma.MeetingUpdateInput = {
      ...rest,
      ...(rest.meetingUrl !== undefined ? { meetingUrl: normalizeUrl(rest.meetingUrl) } : {}),
      updatedBy: userId,
      ...(customerId === null
        ? { customer: { disconnect: true } }
        : customerId
          ? { customer: { connect: { id: customerId } } }
          : {}),
      ...(externalParticipants !== undefined
        ? { externalParticipants: externalParticipants ?? Prisma.JsonNull }
        : {}),
    };

    const meeting = await db.meeting.update({
      where: { id },
      data: payload,
      include: meetingDetailInclude,
    });

    await syncMeetingReminders(
      meeting.id,
      userId,
      meeting.title,
      meeting.scheduledAt,
      meeting.status
    );

    scheduleRagIndex("meeting", meeting.id);
    return meeting;
  },

  async softDelete(id: string, userId: string) {
    const meeting = await db.meeting.update({
      where: { id },
      data: { deletedAt: new Date(), updatedBy: userId, status: "CANCELLED" },
    });
    const { clearMeetingReminders } = await import("@/lib/meetings/reminders");
    await clearMeetingReminders(id);
    scheduleRagRemove("meeting", id);
    return meeting;
  },

  async importCalendarEvents(events: CalendarEventInput[], creatorId: string) {
    const results = { created: 0, updated: 0, skipped: 0, meetings: [] as string[] };

    for (const event of events) {
      const mapped = mapCalendarEventToMeeting(event, creatorId);

      if (mapped.status === "CANCELLED") {
        const existing = await db.meeting.findFirst({
          where: { externalSource: mapped.externalSource, externalId: mapped.externalId },
        });
        if (existing) {
          await db.meeting.update({
            where: { id: existing.id },
            data: { status: "CANCELLED", updatedBy: creatorId },
          });
          await syncMeetingReminders(existing.id, creatorId, existing.title, null, "CANCELLED");
          results.updated += 1;
          results.meetings.push(existing.id);
        } else {
          results.skipped += 1;
        }
        continue;
      }

      const existing = await db.meeting.findFirst({
        where: { externalSource: mapped.externalSource, externalId: mapped.externalId },
      });

      if (existing) {
        const meeting = await db.meeting.update({
          where: { id: existing.id },
          data: {
            title: mapped.title,
            agenda: mapped.agenda,
            scheduledAt: mapped.scheduledAt,
            endsAt: mapped.endsAt,
            durationMinutes: mapped.durationMinutes,
            type: mapped.type,
            status: mapped.status,
            meetingUrl: mapped.meetingUrl,
            location: mapped.location,
            externalParticipants: mapped.externalParticipants,
            updatedBy: creatorId,
          },
          include: meetingDetailInclude,
        });
        await syncMeetingReminders(
          meeting.id,
          creatorId,
          meeting.title,
          meeting.scheduledAt,
          meeting.status
        );
        results.updated += 1;
        results.meetings.push(meeting.id);
        scheduleRagIndex("meeting", meeting.id);
      } else {
        const meeting = await db.meeting.create({
          data: mapped,
          include: meetingDetailInclude,
        });
        await syncMeetingReminders(
          meeting.id,
          creatorId,
          meeting.title,
          meeting.scheduledAt,
          meeting.status
        );
        results.created += 1;
        results.meetings.push(meeting.id);
        scheduleRagIndex("meeting", meeting.id);
      }
    }

    return results;
  },
};
