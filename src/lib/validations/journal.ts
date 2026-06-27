import { z } from "zod";

export const createJournalSchema = z.object({
  content: z.string().min(1),
  lessons: z.string().optional(),
  challenges: z.string().optional(),
  wins: z.string().optional(),
  mood: z.string().optional(),
  date: z.coerce.date().optional(),
});

export const updateJournalSchema = z.object({
  content: z.string().min(1).optional(),
  lessons: z.string().optional(),
  challenges: z.string().optional(),
  wins: z.string().optional(),
  mood: z.string().optional(),
});

export const journalReflectSchema = z.object({
  id: z.string().uuid().optional(),
  content: z.string().min(1).optional(),
}).refine((d) => d.id || d.content, { message: "Either id or content is required." });
