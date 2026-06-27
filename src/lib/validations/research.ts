import { ResearchStage } from "@prisma/client";
import { z } from "zod";

export const createResearchSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  productId: z.string().uuid().optional(),
  stage: z.nativeEnum(ResearchStage).optional(),
});

export const updateResearchSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  productId: z.string().uuid().optional().nullable(),
  stage: z.nativeEnum(ResearchStage).optional(),
});

export const researchActionSchema = z.object({
  id: z.string().uuid(),
});

export const researchSummarizeSchema = z.object({
  id: z.string().uuid(),
});

export const researchChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1),
});

export const researchFromChatSchema = z.object({
  messages: z.array(researchChatMessageSchema).min(1),
  title: z.string().min(1).optional(),
});
