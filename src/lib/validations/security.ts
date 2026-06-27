import { RiskCategory, RiskLevel } from "@prisma/client";
import { z } from "zod";

export const createIncidentSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  severity: z.nativeEnum(RiskLevel).optional(),
  status: z.string().optional(),
});

export const createThreatSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  severity: z.nativeEnum(RiskLevel).optional(),
  source: z.string().optional(),
});

export const updateRiskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  level: z.nativeEnum(RiskLevel).optional(),
  mitigation: z.string().optional(),
  reviewDate: z.coerce.date().optional(),
});

export const updateRiskPatchSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  category: z.nativeEnum(RiskCategory).optional(),
  level: z.nativeEnum(RiskLevel).optional(),
  mitigation: z.string().optional().nullable(),
  reviewDate: z.coerce.date().optional().nullable(),
});

export const createRiskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.nativeEnum(RiskCategory),
  level: z.nativeEnum(RiskLevel).optional(),
  mitigation: z.string().optional(),
  ownerId: z.string().uuid().optional(),
  reviewDate: z.coerce.date().optional(),
});
