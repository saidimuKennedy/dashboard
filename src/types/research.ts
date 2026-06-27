export type ResearchChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ResearchImportanceVerdict = "critical" | "high" | "medium" | "low";

export type ResearchAiAnalysis = {
  importanceScore: number;
  importanceVerdict: ResearchImportanceVerdict;
  importanceRationale: string;
  timeToExecute: string;
  executionIdeas: string[];
  delegationIdeas: string[];
  teamsNeeded: string[];
  resourcesNeeded: string[];
  summary: string;
};

export type ResearchTopicDetail = {
  id: string;
  title: string;
  description: string | null;
  stage: string;
  summary: string | null;
  notes: string | null;
  sourceChat: ResearchChatMessage[] | null;
  aiAnalysis: ResearchAiAnalysis | null;
  createdAt: string;
  updatedAt: string;
  author?: {
    firstName?: string;
    lastName?: string;
  };
};

export function formatChatTranscript(messages: ResearchChatMessage[]): string {
  return messages
    .map((message) => {
      const label = message.role === "user" ? "You" : "AI Assistant";
      return `**${label}**\n${message.content}`;
    })
    .join("\n\n---\n\n");
}

export function parseResearchAiAnalysis(value: unknown): ResearchAiAnalysis | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  if (typeof data.importanceScore !== "number") return null;
  return {
    importanceScore: data.importanceScore,
    importanceVerdict: (data.importanceVerdict as ResearchImportanceVerdict) ?? "medium",
    importanceRationale: String(data.importanceRationale ?? ""),
    timeToExecute: String(data.timeToExecute ?? "Unknown"),
    executionIdeas: Array.isArray(data.executionIdeas) ? data.executionIdeas.map(String) : [],
    delegationIdeas: Array.isArray(data.delegationIdeas) ? data.delegationIdeas.map(String) : [],
    teamsNeeded: Array.isArray(data.teamsNeeded) ? data.teamsNeeded.map(String) : [],
    resourcesNeeded: Array.isArray(data.resourcesNeeded) ? data.resourcesNeeded.map(String) : [],
    summary: String(data.summary ?? ""),
  };
}

export function parseSourceChat(value: unknown): ResearchChatMessage[] | null {
  if (!Array.isArray(value)) return null;
  return value
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const message = item as Record<string, unknown>;
      return {
        role: message.role === "user" ? "user" : "assistant",
        content: String(message.content ?? ""),
      };
    });
}
