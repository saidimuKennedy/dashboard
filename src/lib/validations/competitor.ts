import { z } from "zod";

export const createCompetitorSchema = z.object({
  name: z.string().min(1),
  website: z.string().url().optional(),
  description: z.string().optional(),
  pricing: z.string().optional(),
  features: z.string().optional(),
  notes: z.string().optional(),
});

export const updateCompetitorSchema = z.object({
  name: z.string().min(1).optional(),
  website: z.string().url().optional().nullable(),
  description: z.string().optional().nullable(),
  pricing: z.string().optional().nullable(),
  features: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const competitorPricingSchema = z.object({
  id: z.string().uuid(),
  pricing: z.string().min(1),
});

export const competitorFeaturesSchema = z.object({
  id: z.string().uuid(),
  features: z.string().min(1),
});
