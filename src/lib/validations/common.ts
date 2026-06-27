import { z } from "zod";

export const idParamSchema = z.object({ id: z.string().uuid() });

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const searchQuerySchema = z.object({
  q: z.string().min(1).optional(),
  search: z.string().min(1).optional(),
});

export const aiRequestSchema = z.object({
  prompt: z.string().min(1),
  context: z.array(z.string()).optional(),
  temperature: z.number().min(0).max(2).optional(),
  persona: z.string().optional(),
});

export const idBodySchema = z.object({ id: z.string().uuid() });
