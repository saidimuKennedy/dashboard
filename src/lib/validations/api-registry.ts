import { z } from "zod";

export const createApiRegistrySchema = z.object({
  name: z.string().min(1),
  provider: z.string().optional(),
  baseUrl: z.string().url().optional(),
  authType: z.string().optional(),
  rateLimits: z.string().optional(),
  pricing: z.string().optional(),
  docs: z.string().optional(),
  risks: z.string().optional(),
});

export const updateApiRegistrySchema = z.object({
  name: z.string().min(1).optional(),
  provider: z.string().optional().nullable(),
  baseUrl: z.string().url().optional().nullable(),
  authType: z.string().optional().nullable(),
  rateLimits: z.string().optional().nullable(),
  pricing: z.string().optional().nullable(),
  docs: z.string().optional().nullable(),
  risks: z.string().optional().nullable(),
});

export const apiTestSchema = z.object({
  id: z.string().uuid(),
  endpoint: z.string().optional(),
});

export const apiDocumentSchema = z.object({
  id: z.string().uuid(),
});
