import { z } from "zod";

export const createMeetingSchema = z.object({
  title: z.string().min(1),
  agenda: z.string().optional(),
  minutes: z.string().optional(),
  customerId: z.string().uuid().optional(),
  scheduledAt: z.coerce.date().optional(),
});

export const updateMeetingSchema = z.object({
  title: z.string().min(1).optional(),
  agenda: z.string().optional(),
  minutes: z.string().optional(),
  transcript: z.string().optional(),
  aiSummary: z.string().optional(),
  scheduledAt: z.coerce.date().optional().nullable(),
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
