import { z } from "zod";
import type { ResearchChatMessage } from "@/types/research";

const journalAnalysisSchema = z.object({
  content: z.string().min(1),
  mood: z.string().optional(),
  wins: z.string().optional(),
  challenges: z.string().optional(),
  lessons: z.string().optional(),
  aiSummary: z.string().optional(),
});

export type JournalFromChatAnalysis = z.infer<typeof journalAnalysisSchema>;

function extractJsonObject(content: string): string {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start >= 0 && end > start) return content.slice(start, end + 1);
  return content.trim();
}

function fallbackAnalysis(messages: ResearchChatMessage[]): JournalFromChatAnalysis {
  const userNotes = messages
    .filter((message) => message.role === "user")
    .map((message) => message.content)
    .join("\n\n");
  const assistantNotes = messages
    .filter((message) => message.role === "assistant")
    .map((message) => message.content)
    .join("\n\n");

  return {
    content: userNotes || assistantNotes || "Journal reflection exported from AI chat.",
    mood: undefined,
    wins: undefined,
    challenges: undefined,
    lessons: assistantNotes ? assistantNotes.slice(0, 500) : undefined,
    aiSummary: assistantNotes.slice(0, 280) || userNotes.slice(0, 280),
  };
}

export async function analyzeJournalFromChat(
  callDeepSeek: (systemPrompt: string, userPrompt: string, temperature?: number) => Promise<{ content: string; tokens: number }>,
  messages: ResearchChatMessage[]
): Promise<{ analysis: JournalFromChatAnalysis; tokens: number }> {
  const transcript = messages
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join("\n\n");

  const systemPrompt = `You are a founder journal assistant.
Turn a conversation into a structured journal entry. Respond ONLY with valid JSON (no markdown fences):
{
  "content": "first-person journal narrative of the founder's day/reflection",
  "mood": "single word or short phrase e.g. focused, tired, optimistic",
  "wins": "what went well, as prose or bullet-style text",
  "challenges": "what was difficult",
  "lessons": "what was learned",
  "aiSummary": "one-sentence executive summary"
}`;

  try {
    const { content, tokens } = await callDeepSeek(systemPrompt, transcript, 0.3);
    const analysis = journalAnalysisSchema.parse(JSON.parse(extractJsonObject(content)));
    return { analysis, tokens };
  } catch {
    return { analysis: fallbackAnalysis(messages), tokens: 0 };
  }
}
