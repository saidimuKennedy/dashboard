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

export const aiRequestSchema = z
  .object({
    prompt: z.string().min(1).optional(),
    message: z.string().min(1).optional(),
    context: z.array(z.string()).optional(),
    temperature: z.number().min(0).max(2).optional(),
    persona: z.string().optional(),
    conversationId: z.string().uuid().optional(),
    contextKey: z.string().optional(),
  })
  .refine((data) => Boolean(data.prompt ?? data.message), {
    message: "A prompt or message is required.",
  })
  .transform((data) => ({
    prompt: (data.prompt ?? data.message)!,
    context: data.context,
    temperature: data.temperature,
    persona: data.persona,
    conversationId: data.conversationId,
    contextKey: data.contextKey,
  }));

export const aiConversationCreateSchema = z.object({
  persona: z.string().optional(),
  contextKey: z.string().optional(),
  title: z.string().optional(),
});

export const idBodySchema = z.object({ id: z.string().uuid() });
