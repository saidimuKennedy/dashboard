import { db } from "@/lib/db";

const REMINDER_OFFSETS_MS = [
  24 * 60 * 60 * 1000,
  15 * 60 * 1000,
];

function formatReminderLabel(title: string, scheduledAt: Date, offsetMs: number) {
  if (offsetMs >= 60 * 60 * 1000) {
    return `Tomorrow: ${title}`;
  }
  return `Starting soon: ${title}`;
}

export async function syncMeetingReminders(
  meetingId: string,
  userId: string,
  title: string,
  scheduledAt: Date | null | undefined,
  status: string
) {
  await db.reminder.updateMany({
    where: { meetingId, completed: false },
    data: { deletedAt: new Date() },
  });

  if (!scheduledAt || status !== "SCHEDULED" || scheduledAt.getTime() <= Date.now()) {
    return;
  }

  const reminders = REMINDER_OFFSETS_MS.map((offsetMs) => {
    const dueAt = new Date(scheduledAt.getTime() - offsetMs);
    if (dueAt.getTime() <= Date.now()) return null;
    return {
      title: formatReminderLabel(title, scheduledAt, offsetMs),
      description: `Meeting scheduled for ${scheduledAt.toLocaleString()}`,
      dueAt,
      userId,
      meetingId,
    };
  }).filter(Boolean) as Array<{
    title: string;
    description: string;
    dueAt: Date;
    userId: string;
    meetingId: string;
  }>;

  if (reminders.length) {
    await db.reminder.createMany({ data: reminders });
  }
}

export async function clearMeetingReminders(meetingId: string) {
  await db.reminder.updateMany({
    where: { meetingId, completed: false },
    data: { deletedAt: new Date() },
  });
}
