import type { DecisionStatus } from "@prisma/client";

export type DecisionListItem = {
  id: string;
  title: string;
  status: DecisionStatus;
  reviewDate: string | null;
  outcome: string | null;
  createdAt: string;
  updatedAt: string;
  owner: { id: string; firstName: string; lastName: string } | null;
};

export type DecisionDetail = DecisionListItem & {
  context: string;
  alternatives: string | null;
  decision: string;
  reasoning: string | null;
  evidence: string | null;
};

export type DecisionFromChatAnalysis = {
  title: string;
  context: string;
  alternatives?: string;
  decision: string;
  reasoning?: string;
  evidence?: string;
  reviewDateSuggestion?: string;
};

export type DecisionPremortem = {
  risks: string[];
  assumptions: string[];
  reversalTriggers: string[];
  summary: string;
};

export type ExtractedMeetingDecision = {
  title: string;
  context: string;
  alternatives?: string;
  decision: string;
  reasoning?: string;
};

export type SimilarDecision = {
  id: string;
  title: string;
  decision: string;
  status: DecisionStatus;
  outcome: string | null;
  createdAt: string;
  relevance: string;
};

export const DECISION_STATUS_LABELS: Record<DecisionStatus, string> = {
  PROPOSED: "Proposed",
  APPROVED: "Approved",
  IMPLEMENTED: "Implemented",
  REVIEWED: "Reviewed",
  SUPERSEDED: "Superseded",
};

export const DECISION_STATUS_OPTIONS = Object.entries(DECISION_STATUS_LABELS).map(
  ([value, label]) => ({ value, label })
);

export function formatPremortemEvidence(premortem: DecisionPremortem): string {
  const lines = [
    "## Pre-mortem (AI)",
    "",
    premortem.summary,
    "",
    "**Risks**",
    ...premortem.risks.map((r) => `- ${r}`),
    "",
    "**Assumptions**",
    ...premortem.assumptions.map((a) => `- ${a}`),
    "",
    "**Would reverse if**",
    ...premortem.reversalTriggers.map((t) => `- ${t}`),
  ];
  return lines.join("\n");
}

export function isReviewDue(reviewDate: string | null, status: DecisionStatus): boolean {
  if (!reviewDate) return false;
  if (status === "REVIEWED" || status === "SUPERSEDED") return false;
  return new Date(reviewDate) <= new Date();
}
