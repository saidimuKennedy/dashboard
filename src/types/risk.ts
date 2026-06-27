import type { RiskCategory, RiskLevel } from "@prisma/client";

export type RiskDetail = {
  id: string;
  title: string;
  description: string | null;
  category: RiskCategory;
  level: RiskLevel;
  mitigation: string | null;
  ownerId: string | null;
  reviewDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export const RISK_CATEGORY_LABELS: Record<RiskCategory, string> = {
  OPERATIONAL: "Operational",
  SECURITY: "Security",
  FINANCIAL: "Financial",
  COMPLIANCE: "Compliance",
  PRODUCT: "Product",
};

export const RISK_CATEGORY_OPTIONS = (
  Object.entries(RISK_CATEGORY_LABELS) as [RiskCategory, string][]
).map(([value, label]) => ({ value, label }));

export { RISK_LEVEL_LABELS, RISK_LEVEL_OPTIONS } from "@/types/compliance";
