import type { ComplianceStatus, RiskLevel } from "@prisma/client";

export type ComplianceDetail = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  status: ComplianceStatus;
  riskRating: RiskLevel;
  deadline: string | null;
  evidence: string | null;
  createdAt: string;
  updatedAt: string;
};

export const COMPLIANCE_STATUS_LABELS: Record<ComplianceStatus, string> = {
  COMPLIANT: "Compliant",
  AT_RISK: "At risk",
  NON_COMPLIANT: "Non-compliant",
  PENDING_REVIEW: "Pending review",
};

export const COMPLIANCE_STATUS_OPTIONS = (
  Object.entries(COMPLIANCE_STATUS_LABELS) as [ComplianceStatus, string][]
).map(([value, label]) => ({ value, label }));

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

export const RISK_LEVEL_OPTIONS = (
  Object.entries(RISK_LEVEL_LABELS) as [RiskLevel, string][]
).map(([value, label]) => ({ value, label }));
