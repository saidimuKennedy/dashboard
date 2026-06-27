import type { MeetingOutcome } from "@prisma/client";
import type { MeetingEvaluation } from "@/types/meeting";

type DeepSeekCaller = (
  systemPrompt: string,
  userPrompt: string,
  temperature?: number
) => Promise<{ content: string; tokens: number }>;

export async function evaluateMeetingFromReport(
  callDeepSeek: DeepSeekCaller,
  input: {
    title: string;
    agenda?: string | null;
    outcomeReport?: string | null;
    minutes?: string | null;
    transcript?: string | null;
    aiSummary?: string | null;
    actionItems?: string[];
  }
): Promise<{ evaluation: MeetingEvaluation; tokens: number }> {
  const actionBlock =
    input.actionItems?.length ? `Action items:\n${input.actionItems.map((a) => `- ${a}`).join("\n")}` : "";

  const userPrompt = [
    `Meeting: ${input.title}`,
    input.agenda ? `Agenda:\n${input.agenda}` : "",
    input.outcomeReport ? `Outcome report:\n${input.outcomeReport}` : "",
    input.minutes ? `Minutes:\n${input.minutes}` : "",
    input.transcript ? `Transcript excerpt:\n${input.transcript.slice(0, 4000)}` : "",
    input.aiSummary ? `AI summary:\n${input.aiSummary}` : "",
    actionBlock,
  ]
    .filter(Boolean)
    .join("\n\n");

  const { content, tokens } = await callDeepSeek(
    `You evaluate whether business meetings achieved their goals. Respond ONLY with valid JSON in this shape:
{
  "rating": "SUCCESSFUL" | "PARTIAL" | "UNSUCCESSFUL",
  "summary": "2-3 sentence assessment",
  "achievements": ["what went well"],
  "gaps": ["what was missed or unclear"],
  "nextSteps": ["concrete follow-ups"],
  "risks": ["risks or concerns"]
}
Be direct and evidence-based. If there is insufficient information, use PARTIAL and note gaps.`,
    userPrompt,
    0.2
  );

  const evaluation = parseEvaluationJson(content);
  return { evaluation, tokens };
}

function parseEvaluationJson(content: string): MeetingEvaluation {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return fallbackEvaluation(content);
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as Partial<MeetingEvaluation>;
    const rating = normalizeRating(parsed.rating);
    return {
      rating,
      summary: parsed.summary ?? "Evaluation completed.",
      achievements: arrayOrEmpty(parsed.achievements),
      gaps: arrayOrEmpty(parsed.gaps),
      nextSteps: arrayOrEmpty(parsed.nextSteps),
      risks: arrayOrEmpty(parsed.risks),
    };
  } catch {
    return fallbackEvaluation(content);
  }
}

function normalizeRating(value: unknown): MeetingOutcome {
  if (value === "SUCCESSFUL" || value === "PARTIAL" || value === "UNSUCCESSFUL") {
    return value;
  }
  return "PARTIAL";
}

function arrayOrEmpty(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v) => typeof v === "string") : [];
}

function fallbackEvaluation(content: string): MeetingEvaluation {
  return {
    rating: "PARTIAL",
    summary: content.slice(0, 500),
    achievements: [],
    gaps: ["Could not parse structured evaluation."],
    nextSteps: [],
    risks: [],
  };
}
