import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  status: z.string().optional(),
});

export const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  status: z.string().optional(),
});

export const productReleaseSchema = z.object({
  productId: z.string().uuid(),
  version: z.string().min(1),
  notes: z.string().optional(),
  releasedAt: z.coerce.date().optional(),
});

export const productRoadmapSchema = z.object({
  productId: z.string().uuid(),
  items: z.array(z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    priority: z.string().optional(),
    stage: z.string().optional(),
  })).optional(),
});
