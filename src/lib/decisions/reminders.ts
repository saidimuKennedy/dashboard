import { db } from "@/lib/db";
import type { DecisionStatus } from "@prisma/client";

const ADVANCE_NOTICE_MS = 7 * 24 * 60 * 60 * 1000;

function isActiveForReview(status: DecisionStatus): boolean {
  return status !== "REVIEWED" && status !== "SUPERSEDED";
}

export async function syncDecisionReviewReminders(
  decisionId: string,
  userId: string,
  title: string,
  reviewDate: Date | null | undefined,
  status: DecisionStatus
) {
  await db.reminder.updateMany({
    where: { decisionId, completed: false },
    data: { deletedAt: new Date() },
  });

  if (!reviewDate || !isActiveForReview(status)) {
    return;
  }

  const reminders: Array<{
    title: string;
    description: string;
    dueAt: Date;
    userId: string;
    decisionId: string;
  }> = [];

  const advanceDue = new Date(reviewDate.getTime() - ADVANCE_NOTICE_MS);
  if (advanceDue.getTime() > Date.now()) {
    reminders.push({
      title: `Review soon: ${title}`,
      description: `Decision review scheduled for ${reviewDate.toLocaleDateString()}`,
      dueAt: advanceDue,
      userId,
      decisionId,
    });
  }

  if (reviewDate.getTime() > Date.now()) {
    reminders.push({
      title: `Review due: ${title}`,
      description: `Revisit this decision and record the outcome.`,
      dueAt: reviewDate,
      userId,
      decisionId,
    });
  } else if (isActiveForReview(status)) {
    reminders.push({
      title: `Review overdue: ${title}`,
      description: `Review date passed — record what happened.`,
      dueAt: new Date(),
      userId,
      decisionId,
    });
  }

  if (reminders.length) {
    await db.reminder.createMany({ data: reminders });
  }
}

export async function clearDecisionReminders(decisionId: string) {
  await db.reminder.updateMany({
    where: { decisionId, completed: false },
    data: { deletedAt: new Date() },
  });
}
