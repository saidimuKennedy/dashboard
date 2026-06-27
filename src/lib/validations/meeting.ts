import { z } from "zod";

const meetingTypeSchema = z.enum(["VIRTUAL", "IN_PERSON", "HYBRID"]);
const meetingStatusSchema = z.enum(["SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"]);
const meetingOutcomeSchema = z.enum(["PENDING", "SUCCESSFUL", "PARTIAL", "UNSUCCESSFUL"]);

const externalParticipantSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
});

export const createMeetingSchema = z.object({
  title: z.string().min(1),
  agenda: z.string().optional(),
  minutes: z.string().optional(),
  customerId: z.string().uuid().optional(),
  scheduledAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
  durationMinutes: z.coerce.number().int().positive().optional(),
  type: meetingTypeSchema.optional(),
  status: meetingStatusSchema.optional(),
  meetingUrl: z.string().url().optional().or(z.literal("")),
  location: z.string().optional(),
  outcomeReport: z.string().optional(),
  externalParticipants: z.array(externalParticipantSchema).optional(),
});

export const updateMeetingSchema = z.object({
  title: z.string().min(1).optional(),
  agenda: z.string().optional().nullable(),
  minutes: z.string().optional().nullable(),
  transcript: z.string().optional().nullable(),
  aiSummary: z.string().optional().nullable(),
  aiEvaluation: z.string().optional().nullable(),
  scheduledAt: z.coerce.date().optional().nullable(),
  endsAt: z.coerce.date().optional().nullable(),
  durationMinutes: z.coerce.number().int().positive().optional().nullable(),
  type: meetingTypeSchema.optional(),
  status: meetingStatusSchema.optional(),
  outcome: meetingOutcomeSchema.optional(),
  meetingUrl: z.string().url().optional().nullable().or(z.literal("")),
  location: z.string().optional().nullable(),
  outcomeReport: z.string().optional().nullable(),
  customerId: z.string().uuid().optional().nullable(),
  externalParticipants: z.array(externalParticipantSchema).optional().nullable(),
});

export const meetingTranscribeSchema = z.object({
  meetingId: z.string().uuid(),
  audioUrl: z.string().url().optional(),
  transcript: z.string().optional(),
});

export const meetingSummarySchema = z.object({
  meetingId: z.string().uuid(),
});

export const meetingActionItemsSchema = z.object({
  meetingId: z.string().uuid(),
  transcript: z.string().optional(),
});

export const meetingEvaluateSchema = z.object({
  meetingId: z.string().uuid(),
});

export const calendarEventImportSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  location: z.string().optional(),
  start: z.coerce.date(),
  end: z.coerce.date().optional(),
  status: z.enum(["confirmed", "cancelled", "tentative"]).optional(),
  attendees: z
    .array(
      z.object({
        name: z.string().optional(),
        email: z.string().email().optional(),
      })
    )
    .optional(),
  source: z.enum(["google_calendar", "outlook", "manual"]).default("manual"),
});

export const meetingImportSchema = z.object({
  events: z.array(calendarEventImportSchema).min(1).max(100),
});
