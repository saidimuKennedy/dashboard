import { z } from "zod";

export const markNotificationsReadSchema = z.object({
  ids: z.array(z.string().uuid()).optional(),
  all: z.boolean().optional(),
});

export const deleteNotificationsSchema = z.object({
  ids: z.array(z.string().uuid()).optional(),
  all: z.boolean().optional(),
});

export const createReminderSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  dueAt: z.coerce.date(),
});

export const updateReminderSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  dueAt: z.coerce.date().optional(),
  completed: z.boolean().optional(),
});

export const deleteReminderSchema = z.object({
  id: z.string().uuid(),
});
