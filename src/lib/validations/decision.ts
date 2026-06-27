import { DecisionStatus } from "@prisma/client";
import { z } from "zod";

export const createDecisionSchema = z.object({
  title: z.string().min(1),
  context: z.string().min(1),
  alternatives: z.string().optional(),
  decision: z.string().min(1),
  reasoning: z.string().optional(),
  evidence: z.string().optional(),
  ownerId: z.string().uuid().optional(),
  reviewDate: z.coerce.date().optional(),
  status: z.nativeEnum(DecisionStatus).optional(),
  runPremortem: z.boolean().optional(),
});

export const decisionFromChatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1),
      })
    )
    .min(1),
});

export const decisionFromMeetingSchema = z.object({
  meetingId: z.string().uuid(),
});

export const decisionPremortemSchema = z.object({
  title: z.string().min(1),
  context: z.string().min(1),
  decision: z.string().min(1),
  alternatives: z.string().optional(),
  reasoning: z.string().optional(),
});

export const decisionSimilarSchema = z.object({
  title: z.string().min(1),
  context: z.string().min(1),
  decision: z.string().min(1),
  excludeId: z.string().uuid().optional(),
});

export const updateDecisionSchema = z.object({
  title: z.string().min(1).optional(),
  context: z.string().optional(),
  alternatives: z.string().optional().nullable(),
  decision: z.string().optional(),
  reasoning: z.string().optional().nullable(),
  outcome: z.string().optional().nullable(),
  evidence: z.string().optional().nullable(),
  status: z.nativeEnum(DecisionStatus).optional(),
  reviewDate: z.coerce.date().optional().nullable(),
});

export const decisionReviewSchema = z.object({
  id: z.string().uuid(),
  outcome: z.string().optional(),
  status: z.nativeEnum(DecisionStatus).optional(),
});
