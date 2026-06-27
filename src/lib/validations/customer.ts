import { z } from "zod";

export const createCustomerSchema = z.object({
  name: z.string().min(1),
  company: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  industry: z.string().optional(),
  notes: z.string().optional(),
});

export const updateCustomerSchema = z.object({
  name: z.string().min(1).optional(),
  company: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  industry: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const customerFeedbackSchema = z.object({
  customerId: z.string().uuid(),
  content: z.string().min(1),
  rating: z.number().int().min(1).max(5).optional(),
  productId: z.string().uuid().optional(),
});

export const customerNoteSchema = z.object({
  customerId: z.string().uuid(),
  note: z.string().min(1),
});

export const customerTimelineSchema = z.object({
  customerId: z.string().uuid(),
});
