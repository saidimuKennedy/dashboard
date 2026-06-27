import { z } from "zod";
import type { ResearchAiAnalysis, ResearchChatMessage } from "@/types/research";

const researchAnalysisSchema = z.object({
  title: z.string().min(1),
  importanceScore: z.number().min(0).max(100),
  importanceVerdict: z.enum(["critical", "high", "medium", "low"]),
  importanceRationale: z.string(),
  timeToExecute: z.string(),
  executionIdeas: z.array(z.string()),
  delegationIdeas: z.array(z.string()),
  teamsNeeded: z.array(z.string()),
  resourcesNeeded: z.array(z.string()),
  summary: z.string(),
});

function extractJsonObject(content: string): string {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start >= 0 && end > start) return content.slice(start, end + 1);
  return content.trim();
}

function fallbackAnalysis(messages: ResearchChatMessage[]): {
  title: string;
  analysis: ResearchAiAnalysis;
} {
  const firstUser = messages.find((message) => message.role === "user")?.content ?? "Research Topic";
  const lastAssistant =
    [...messages].reverse().find((message) => message.role === "assistant")?.content ?? "";

  return {
    title: firstUser.slice(0, 80),
    analysis: {
      importanceScore: 65,
      importanceVerdict: "medium",
      importanceRationale: "AI analysis unavailable. Review the exported chat manually.",
      timeToExecute: "To be determined",
      executionIdeas: ["Review the AI conversation and define next steps."],
      delegationIdeas: ["Identify owners for each workstream after manual review."],
      teamsNeeded: ["Product", "Operations"],
      resourcesNeeded: ["Time for stakeholder review", "Budget estimate pending"],
      summary: lastAssistant.slice(0, 500) || firstUser.slice(0, 500),
    },
  };
}

export async function analyzeResearchFromChat(
  callDeepSeek: (systemPrompt: string, userPrompt: string, temperature?: number) => Promise<{ content: string; tokens: number }>,
  messages: ResearchChatMessage[]
): Promise<{ title: string; analysis: ResearchAiAnalysis; tokens: number }> {
  const transcript = messages
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join("\n\n");

  const systemPrompt = `You are a strategic research analyst for an African software company.
Analyze research conversations and respond ONLY with valid JSON (no markdown fences).
Use this exact shape:
{
  "title": "short descriptive title",
  "importanceScore": 0-100,
  "importanceVerdict": "critical|high|medium|low",
  "importanceRationale": "why this research matters strategically",
  "timeToExecute": "estimated timeline e.g. 3-6 months",
  "executionIdeas": ["actionable idea"],
  "delegationIdeas": ["what to delegate and to whom"],
  "teamsNeeded": ["team or role"],
  "resourcesNeeded": ["budget, tools, partners"],
  "summary": "executive summary of the research"
}`;

  try {
    const { content, tokens } = await callDeepSeek(systemPrompt, transcript, 0.2);
    const parsed = researchAnalysisSchema.parse(JSON.parse(extractJsonObject(content)));
    const { title, ...analysis } = parsed;
    return { title, analysis, tokens };
  } catch {
    const fallback = fallbackAnalysis(messages);
    return { ...fallback, tokens: 0 };
  }
}
