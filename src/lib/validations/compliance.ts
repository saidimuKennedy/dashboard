import { ComplianceStatus, RiskLevel } from "@prisma/client";
import { z } from "zod";

export const createComplianceSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.string().min(1),
  status: z.nativeEnum(ComplianceStatus).optional(),
  riskRating: z.nativeEnum(RiskLevel).optional(),
  deadline: z.coerce.date().optional(),
  evidence: z.string().optional(),
});

export const updateComplianceSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  category: z.string().optional(),
  status: z.nativeEnum(ComplianceStatus).optional(),
  riskRating: z.nativeEnum(RiskLevel).optional(),
  deadline: z.coerce.date().optional().nullable(),
  evidence: z.string().optional().nullable(),
});

export const complianceReviewSchema = z.object({
  id: z.string().uuid(),
  status: z.nativeEnum(ComplianceStatus),
  notes: z.string().optional(),
});

export const complianceEvidenceSchema = z.object({
  id: z.string().uuid(),
  evidence: z.string().min(1),
});
