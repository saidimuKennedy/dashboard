import type {
  MeetingOutcome,
  MeetingStatus,
  MeetingType,
} from "@prisma/client";

export type ExternalParticipant = {
  name: string;
  email?: string;
};

export type MeetingListItem = {
  id: string;
  title: string;
  type: MeetingType;
  status: MeetingStatus;
  outcome: MeetingOutcome;
  scheduledAt: string | null;
  endsAt: string | null;
  meetingUrl: string | null;
  location: string | null;
  customer: { id: string; name: string } | null;
  creator: { id: string; firstName: string; lastName: string };
  actionItems: { id: string; title: string; completed: boolean }[];
  aiSummary: string | null;
};

export type MeetingDetail = MeetingListItem & {
  agenda: string | null;
  minutes: string | null;
  transcript: string | null;
  outcomeReport: string | null;
  aiEvaluation: string | null;
  durationMinutes: number | null;
  externalSource: string | null;
  externalId: string | null;
  externalParticipants: ExternalParticipant[] | null;
  customerId: string | null;
  participants: Array<{
    user: { id: string; firstName: string; lastName: string; email: string };
  }>;
  actionItems: Array<{
    id: string;
    title: string;
    completed: boolean;
    dueDate: string | null;
  }>;
  createdAt: string;
  updatedAt: string;
};

export type MeetingEvaluation = {
  rating: MeetingOutcome;
  summary: string;
  achievements: string[];
  gaps: string[];
  nextSteps: string[];
  risks: string[];
};

export function parseMeetingEvaluation(raw: string | null | undefined): MeetingEvaluation | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as MeetingEvaluation;
    if (!parsed.rating || !parsed.summary) return null;
    return parsed;
  } catch {
    return null;
  }
}

export const MEETING_TYPE_LABELS: Record<MeetingType, string> = {
  VIRTUAL: "Virtual",
  IN_PERSON: "In person",
  HYBRID: "Hybrid",
};

export const MEETING_STATUS_LABELS: Record<MeetingStatus, string> = {
  SCHEDULED: "Scheduled",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No show",
};

export const MEETING_OUTCOME_LABELS: Record<MeetingOutcome, string> = {
  PENDING: "Pending review",
  SUCCESSFUL: "Successful",
  PARTIAL: "Partial",
  UNSUCCESSFUL: "Unsuccessful",
};
