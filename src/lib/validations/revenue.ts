import { z } from "zod";

export const createRevenueSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().default("KES"),
  type: z.string().min(1),
  description: z.string().optional(),
  customerId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  recordedAt: z.coerce.date().optional(),
});

export const updateRevenueSchema = z.object({
  amount: z.number().positive().optional(),
  currency: z.string().optional(),
  type: z.string().optional(),
  description: z.string().optional().nullable(),
  customerId: z.string().uuid().optional().nullable(),
  productId: z.string().uuid().optional().nullable(),
  recordedAt: z.coerce.date().optional(),
});
