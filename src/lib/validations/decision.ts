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
});

export const updateDecisionSchema = z.object({
  title: z.string().min(1).optional(),
  context: z.string().optional(),
  alternatives: z.string().optional(),
  decision: z.string().optional(),
  reasoning: z.string().optional(),
  outcome: z.string().optional(),
  evidence: z.string().optional(),
  status: z.nativeEnum(DecisionStatus).optional(),
  reviewDate: z.coerce.date().optional().nullable(),
});

export const decisionReviewSchema = z.object({
  id: z.string().uuid(),
  outcome: z.string().optional(),
  status: z.nativeEnum(DecisionStatus).optional(),
});
