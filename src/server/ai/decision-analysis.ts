import { z } from "zod";
import type { ResearchChatMessage } from "@/types/research";
import type {
  DecisionFromChatAnalysis,
  DecisionPremortem,
  ExtractedMeetingDecision,
} from "@/types/decision";

type DeepSeekCaller = (
  systemPrompt: string,
  userPrompt: string,
  temperature?: number
) => Promise<{ content: string; tokens: number }>;

const decisionFromChatSchema = z.object({
  title: z.string().min(1),
  context: z.string().min(1),
  alternatives: z.string().optional(),
  decision: z.string().min(1),
  reasoning: z.string().optional(),
  evidence: z.string().optional(),
  reviewDateSuggestion: z.string().optional(),
});

const premortemSchema = z.object({
  summary: z.string(),
  risks: z.array(z.string()),
  assumptions: z.array(z.string()),
  reversalTriggers: z.array(z.string()),
});

const meetingDecisionsSchema = z.object({
  decisions: z.array(
    z.object({
      title: z.string().min(1),
      context: z.string().min(1),
      alternatives: z.string().optional(),
      decision: z.string().min(1),
      reasoning: z.string().optional(),
    })
  ),
});

function extractJsonObject(content: string): string {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start >= 0 && end > start) return content.slice(start, end + 1);
  return content.trim();
}

function fallbackFromChat(messages: ResearchChatMessage[]): DecisionFromChatAnalysis {
  const userText = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join("\n\n");
  const assistantText = messages
    .filter((m) => m.role === "assistant")
    .map((m) => m.content)
    .join("\n\n");

  return {
    title: userText.slice(0, 80) || "Decision from AI chat",
    context: userText || assistantText,
    decision: assistantText.slice(0, 500) || userText.slice(0, 500) || "See chat for details.",
    reasoning: assistantText ? assistantText.slice(0, 500) : undefined,
  };
}

export async function analyzeDecisionFromChat(
  callDeepSeek: DeepSeekCaller,
  messages: ResearchChatMessage[]
): Promise<{ analysis: DecisionFromChatAnalysis; tokens: number }> {
  const transcript = messages
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n\n");

  const systemPrompt = `You are a decision-log assistant for a founder.
Turn a conversation into a structured decision record. Respond ONLY with valid JSON (no markdown fences):
{
  "title": "short decision title",
  "context": "background and situation",
  "alternatives": "options considered (prose or bullets)",
  "decision": "what was decided",
  "reasoning": "why this choice",
  "evidence": "supporting facts or constraints",
  "reviewDateSuggestion": "ISO date string when to review e.g. 2026-09-01, or omit"
}
If no clear decision was made, infer the most likely decision under discussion.`;

  try {
    const { content, tokens } = await callDeepSeek(systemPrompt, transcript, 0.25);
    const analysis = decisionFromChatSchema.parse(JSON.parse(extractJsonObject(content)));
    return { analysis, tokens };
  } catch {
    return { analysis: fallbackFromChat(messages), tokens: 0 };
  }
}

export async function extractDecisionsFromMeeting(
  callDeepSeek: DeepSeekCaller,
  input: {
    title: string;
    agenda?: string | null;
    outcomeReport?: string | null;
    minutes?: string | null;
    transcript?: string | null;
    aiSummary?: string | null;
  }
): Promise<{ decisions: ExtractedMeetingDecision[]; tokens: number }> {
  const userPrompt = [
    `Meeting: ${input.title}`,
    input.agenda ? `Agenda:\n${input.agenda}` : "",
    input.outcomeReport ? `Outcome report:\n${input.outcomeReport}` : "",
    input.minutes ? `Minutes:\n${input.minutes}` : "",
    input.transcript ? `Transcript excerpt:\n${input.transcript.slice(0, 4000)}` : "",
    input.aiSummary ? `AI summary:\n${input.aiSummary}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const systemPrompt = `Extract explicit or implicit business decisions from meeting notes.
Respond ONLY with valid JSON (no markdown fences):
{
  "decisions": [
    {
      "title": "short title",
      "context": "situation from the meeting",
      "alternatives": "options discussed if any",
      "decision": "what was decided",
      "reasoning": "why"
    }
  ]
}
Return an empty decisions array if none are found.`;

  try {
    const { content, tokens } = await callDeepSeek(systemPrompt, userPrompt, 0.2);
    const parsed = meetingDecisionsSchema.parse(JSON.parse(extractJsonObject(content)));
    return { decisions: parsed.decisions, tokens };
  } catch {
    return { decisions: [], tokens: 0 };
  }
}

export async function runDecisionPremortem(
  callDeepSeek: DeepSeekCaller,
  input: {
    title: string;
    context: string;
    decision: string;
    alternatives?: string;
    reasoning?: string;
  }
): Promise<{ premortem: DecisionPremortem; tokens: number }> {
  const userPrompt = [
    `Title: ${input.title}`,
    `Context:\n${input.context}`,
    input.alternatives ? `Alternatives:\n${input.alternatives}` : "",
    `Decision:\n${input.decision}`,
    input.reasoning ? `Reasoning:\n${input.reasoning}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const systemPrompt = `You run a pre-mortem on a business decision. Be direct and practical.
Respond ONLY with valid JSON (no markdown fences):
{
  "summary": "2-3 sentence pre-mortem overview",
  "risks": ["what could go wrong"],
  "assumptions": ["implicit assumptions being made"],
  "reversalTriggers": ["conditions that should trigger reversing this decision"]
}`;

  try {
    const { content, tokens } = await callDeepSeek(systemPrompt, userPrompt, 0.35);
    const premortem = premortemSchema.parse(JSON.parse(extractJsonObject(content)));
    return { premortem, tokens };
  } catch {
    return {
      premortem: {
        summary: "Pre-mortem could not be generated.",
        risks: [],
        assumptions: [],
        reversalTriggers: [],
      },
      tokens: 0,
    };
  }
}

export async function summarizeSimilarDecisions(
  callDeepSeek: DeepSeekCaller,
  query: { title: string; context: string; decision: string },
  candidates: Array<{ title: string; decision: string; outcome: string | null }>
): Promise<{ relevance: string[]; tokens: number }> {
  if (!candidates.length) return { relevance: [], tokens: 0 };

  const userPrompt = [
    "New decision:",
    `Title: ${query.title}`,
    `Context: ${query.context}`,
    `Decision: ${query.decision}`,
    "",
    "Past decisions:",
    ...candidates.map(
      (c, i) =>
        `${i + 1}. ${c.title}\n   Decision: ${c.decision}\n   Outcome: ${c.outcome ?? "not recorded"}`
    ),
  ].join("\n");

  const systemPrompt = `For each numbered past decision, write one short sentence on how it relates to the new decision (conflict, precedent, lesson, or unrelated).
Respond ONLY with valid JSON: { "relevance": ["sentence for decision 1", ...] }
Array length must match the number of past decisions.`;

  try {
    const { content, tokens } = await callDeepSeek(systemPrompt, userPrompt, 0.2);
    const parsed = z.object({ relevance: z.array(z.string()) }).parse(JSON.parse(extractJsonObject(content)));
    return { relevance: parsed.relevance, tokens };
  } catch {
    return { relevance: candidates.map(() => "Related past decision."), tokens: 0 };
  }
}
