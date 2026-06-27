export type CustomerStatus = "PROSPECT" | "ACTIVE" | "CHURNED" | "ARCHIVED";
export type ContractStatus = "DRAFT" | "ACTIVE" | "EXPIRING" | "EXPIRED" | "TERMINATED";

export type ContractClosureWarning = "critical" | "warning" | "notice" | null;

export type CustomerContract = {
  id: string;
  customerId: string;
  title: string;
  terms: string | null;
  content: string | null;
  startDate: string;
  endDate: string;
  value: number | null;
  currency: string;
  status: ContractStatus;
  isRetainer: boolean;
  parentId: string | null;
  retainers?: CustomerContract[];
  closureWarning?: ContractClosureWarning;
  daysUntilEnd?: number;
};

export type CustomerAlias = {
  id: string;
  customerId: string;
  alias: string;
};

export type CustomerAiAnalysis = {
  dealScore: number;
  dealRank?: number;
  dealVerdict: "excellent" | "good" | "fair" | "at_risk";
  dealRationale: string;
  productRecommendations: {
    productName: string;
    rationale: string;
    fitScore: number;
  }[];
  contractAdvice: string[];
  summary: string;
  analyzedAt: string;
};

export type PortfolioCustomerInsight = {
  alias: string;
  customerId: string;
  dealScore: number;
  dealRank?: number;
  dealVerdict: CustomerAiAnalysis["dealVerdict"];
  summary: string;
  topProduct?: string;
};

export type ContractTemplateSettings = {
  headerColor: string;
  accentColor: string;
  fontFamily: string;
  logoUrl: string;
  footerText: string;
  includeSignatureBlock: boolean;
  companyName: string;
};

export const DEFAULT_CONTRACT_SETTINGS: ContractTemplateSettings = {
  headerColor: "#1e3a5f",
  accentColor: "#2563eb",
  fontFamily: "Georgia, 'Times New Roman', serif",
  logoUrl: "",
  footerText: "Confidential — Jiaminie Tech Ltd.",
  includeSignatureBlock: true,
  companyName: "Jiaminie Tech Ltd.",
};

export type CustomerListItem = {
  id: string;
  name: string;
  company: string | null;
  industry: string | null;
  status: CustomerStatus;
  updatedAt: string;
  contracts?: { id: string; endDate: string; status: ContractStatus }[];
  alias?: CustomerAlias | null;
};

export type CustomerDetail = {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  industry: string | null;
  notes: string | null;
  status: CustomerStatus;
  aiAnalysis: CustomerAiAnalysis | null;
  createdAt: string;
  updatedAt: string;
  alias: CustomerAlias | null;
  contracts: CustomerContract[];
  products: { product: { id: string; name: string; description: string | null } }[];
  feedback: { id: string; content: string; rating: number | null; createdAt: string }[];
  meetings: { id: string; title: string; scheduledAt: string | null; createdAt: string }[];
  revenue: { id: string; amount: number; currency: string; type: string; recordedAt: string }[];
  support: { id: string; subject: string; status: string; createdAt: string }[];
};

export function getContractClosureWarning(endDate: string | Date): {
  warning: ContractClosureWarning;
  daysUntilEnd: number;
} {
  const end = new Date(endDate);
  const now = new Date();
  const msPerDay = 86400000;
  const daysUntilEnd = Math.ceil((end.getTime() - now.getTime()) / msPerDay);

  if (daysUntilEnd < 0) return { warning: null, daysUntilEnd };
  if (daysUntilEnd <= 14) return { warning: "critical", daysUntilEnd };
  if (daysUntilEnd <= 30) return { warning: "warning", daysUntilEnd };
  if (daysUntilEnd <= 60) return { warning: "notice", daysUntilEnd };
  return { warning: null, daysUntilEnd };
}

export function parseCustomerAiAnalysis(value: unknown): CustomerAiAnalysis | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  if (typeof data.dealScore !== "number") return null;
  return {
    dealScore: data.dealScore as number,
    dealRank: typeof data.dealRank === "number" ? data.dealRank : undefined,
    dealVerdict: (data.dealVerdict as CustomerAiAnalysis["dealVerdict"]) ?? "fair",
    dealRationale: String(data.dealRationale ?? ""),
    productRecommendations: Array.isArray(data.productRecommendations)
      ? (data.productRecommendations as CustomerAiAnalysis["productRecommendations"])
      : [],
    contractAdvice: Array.isArray(data.contractAdvice) ? (data.contractAdvice as string[]) : [],
    summary: String(data.summary ?? ""),
    analyzedAt: String(data.analyzedAt ?? new Date().toISOString()),
  };
}

export function enrichContract(contract: CustomerContract): CustomerContract {
  const { warning, daysUntilEnd } = getContractClosureWarning(contract.endDate);
  return { ...contract, closureWarning: warning, daysUntilEnd };
}
