import { ArticleStatus } from "@prisma/client";
import { z } from "zod";

export const createKnowledgeSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  summary: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  status: z.nativeEnum(ArticleStatus).optional(),
  tagIds: z.array(z.string().uuid()).optional(),
});

export const updateKnowledgeSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  summary: z.string().optional(),
  categoryId: z.string().uuid().optional().nullable(),
  status: z.nativeEnum(ArticleStatus).optional(),
});

export const knowledgeSearchSchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().min(1).max(50).optional(),
});

export const knowledgeSummarizeSchema = z.object({
  id: z.string().uuid().optional(),
  content: z.string().min(1).optional(),
}).refine((d) => d.id || d.content, { message: "Either id or content is required." });

export const knowledgeEmbedSchema = z.object({
  id: z.string().uuid(),
});

export const knowledgeRelatedSchema = z.object({
  id: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(20).optional(),
});
