import { db } from "@/lib/db";
import { getDeepSeekApiKey } from "@/lib/ai/deepseek";
import { knowledgeRepository } from "@/server/repositories/knowledge.repository";
import { analyzeResearchFromChat } from "@/server/ai/research-analysis";
import { analyzeJournalFromChat } from "@/server/ai/journal-analysis";
import { evaluateMeetingFromReport } from "@/server/ai/meeting-analysis";
import {
  analyzeCustomerProfile,
  analyzeCustomerPortfolio,
  generateContractContent,
} from "@/server/ai/customer-analysis";
import {
  assertNoPii,
  buildMaskedCustomerContext,
  maskPii,
  type PiiProfile,
} from "@/lib/ai/pii-mask";
import { aiConversationRepository } from "@/server/repositories/ai-conversation.repository";
import type { ResearchChatMessage } from "@/types/research";

export type AiRequest = {
  prompt: string;
  context?: string[];
  temperature?: number;
  persona?: string;
  conversationId?: string;
  contextKey?: string;
};

export type AiResponse = {
  response: string;
  sources: { id: string; title: string; type: string }[];
  confidence: number;
  tokens: number;
  conversationId?: string;
};

const PROMPTS: Record<string, string> = {
  business_advisor: "You are a business advisor for Jiaminie Tech, an African software company. Provide evidence-based recommendations.",
  compliance_advisor: "You are a compliance advisor. Reference regulations including KRA, Kenya Data Protection Act, Meta and Google policies.",
  research_assistant: "You are a research assistant. Synthesize information and suggest next steps.",
  meeting_assistant: "You are a meeting assistant for a founder. Summarize discussions, extract action items, and evaluate whether meetings achieved their goals based on agendas and outcome reports. Be direct about gaps, risks, and follow-ups.",
  revenue_advisor: "You are a revenue analyst. Analyze financial trends and provide forecasts.",
  founder_brief: "Generate a concise daily executive brief for the founder highlighting priorities, risks, and opportunities.",
  journal_assistant: "You are a founder journal coach. Help the founder reflect on their day — wins, challenges, lessons, and mood. Ask clarifying questions when useful and write in a warm, concise tone.",
  customer_success_advisor: "You are a customer success advisor. Discuss customers ONLY by their assigned alias. Never ask for or reference real names, emails, phone numbers, or company names. Provide deal insights, product recommendations, and contract advice based on masked profile data.",
};

async function retrieveContext(query: string, limit = 5) {
  const articles = await knowledgeRepository.search(query, limit);
  return articles.map((a) => ({
    id: a.id,
    title: a.title,
    type: "knowledge",
    excerpt: a.summary ?? "",
  }));
}

async function callDeepSeek(systemPrompt: string, userPrompt: string, temperature = 0.3): Promise<{ content: string; tokens: number }> {
  const apiKey = await getDeepSeekApiKey();
  if (!apiKey) {
    return {
      content: `[AI Offline] DeepSeek API key not configured. Based on local knowledge: ${userPrompt.slice(0, 500)}`,
      tokens: 0,
    };
  }

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature,
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content ?? "";
  const tokens = data.usage?.total_tokens ?? 0;
  return { content, tokens };
}

export const aiService = {
  async chat(userId: string, request: AiRequest): Promise<AiResponse> {
    const persona = request.persona ?? "business_advisor";
    const systemPrompt = PROMPTS[persona] ?? PROMPTS.business_advisor;
    const sources = await retrieveContext(request.prompt);
    const extraContext: string[] = [...(request.context ?? [])];

    if (request.contextKey === "/revenue") {
      const { getRevenueFactsForAgent } = await import("@/lib/finance/reports");
      extraContext.push(await getRevenueFactsForAgent());
    }

    if (request.contextKey?.startsWith("/meetings")) {
      const meetingContext = await buildMeetingChatContext(request.contextKey);
      if (meetingContext) extraContext.push(meetingContext);
    }

    const contextBlock = [
      ...extraContext,
      ...sources.map((s) => `[${s.title}]: ${s.excerpt}`),
    ].join("\n");

    const userPrompt = contextBlock
      ? `Context:\n${contextBlock}\n\nQuestion: ${request.prompt}`
      : request.prompt;

    const { content, tokens } = await callDeepSeek(systemPrompt, userPrompt, request.temperature);

    let conversation = request.conversationId
      ? await db.aiConversation.findFirst({
          where: { id: request.conversationId, userId },
        })
      : null;

    if (!conversation) {
      conversation = await db.aiConversation.create({
        data: {
          userId,
          persona,
          contextKey: request.contextKey,
          title: request.prompt.slice(0, 80),
        },
      });
    } else if (!conversation.title) {
      await db.aiConversation.update({
        where: { id: conversation.id },
        data: { title: request.prompt.slice(0, 80) },
      });
    }

    await db.aiMessage.createMany({
      data: [
        { conversationId: conversation.id, role: "user", content: request.prompt },
        {
          conversationId: conversation.id,
          role: "assistant",
          content,
          sources: sources,
          confidence: sources.length > 0 ? 0.85 : 0.6,
          tokens,
        },
      ],
    });

    await aiConversationRepository.touch(conversation.id);

    return {
      response: content,
      sources,
      confidence: sources.length > 0 ? 0.85 : 0.6,
      tokens,
      conversationId: conversation.id,
    };
  },

  async summarize(content: string, type = "general"): Promise<AiResponse> {
    const { content: summary, tokens } = await callDeepSeek(
      `Summarize the following ${type} content concisely with key takeaways.`,
      content
    );
    return { response: summary, sources: [], confidence: 0.9, tokens };
  },

  async founderBrief(): Promise<AiResponse> {
    const [articles, meetings, risks, compliance] = await Promise.all([
      db.knowledgeArticle.count({ where: { deletedAt: null } }),
      db.meeting.count({ where: { deletedAt: null, createdAt: { gte: new Date(Date.now() - 86400000) } } }),
      db.risk.count({ where: { deletedAt: null, level: { in: ["HIGH", "CRITICAL"] } } }),
      db.complianceItem.count({ where: { deletedAt: null, status: { in: ["AT_RISK", "NON_COMPLIANT"] } } }),
    ]);

    const prompt = `Generate founder brief. Stats: ${articles} articles, ${meetings} meetings yesterday, ${risks} high risks, ${compliance} compliance issues.`;
    return this.chat("system", { prompt, persona: "founder_brief" });
  },

  async searchSemantic(query: string) {
    return retrieveContext(query, 10);
  },

  async analyzeResearchChat(messages: ResearchChatMessage[]) {
    return analyzeResearchFromChat(callDeepSeek, messages);
  },

  async analyzeJournalChat(messages: ResearchChatMessage[]) {
    return analyzeJournalFromChat(callDeepSeek, messages);
  },

  async chatWithMaskedCustomer(
    userId: string,
    profile: PiiProfile,
    maskedContext: string,
    prompt: string,
    conversationId?: string,
    customerId?: string
  ): Promise<AiResponse> {
    const maskedPrompt = maskPii(prompt, profile);
    assertNoPii(maskedPrompt, profile);
    assertNoPii(maskedContext, profile);

    return this.chat(userId, {
      prompt: maskedPrompt,
      context: [maskedContext],
      persona: "customer_success_advisor",
      conversationId,
      contextKey: customerId ? `/customers/${customerId}` : "/customers",
    });
  },

  async analyzeCustomer(profile: PiiProfile, maskedContext: string, alias: string, products: string[]) {
    assertNoPii(maskedContext, profile);
    return analyzeCustomerProfile(callDeepSeek, maskedContext, alias, products);
  },

  async analyzePortfolio(maskedProfiles: string[]) {
    return analyzeCustomerPortfolio(callDeepSeek, maskedProfiles);
  },

  async generateCustomerContract(
    profile: PiiProfile,
    maskedContext: string,
    terms: string,
    templateStyle: string
  ) {
    const maskedTerms = maskPii(terms, profile);
    assertNoPii(maskedContext, profile);
    assertNoPii(maskedTerms, profile);
    return generateContractContent(callDeepSeek, maskedContext, maskedTerms, templateStyle);
  },

  async evaluateMeeting(meeting: {
    title: string;
    agenda?: string | null;
    outcomeReport?: string | null;
    minutes?: string | null;
    transcript?: string | null;
    aiSummary?: string | null;
    actionItems?: string[];
  }) {
    const { evaluation, tokens } = await evaluateMeetingFromReport(callDeepSeek, meeting);
    return {
      response: JSON.stringify(evaluation),
      evaluation,
      sources: [],
      confidence: 0.9,
      tokens,
    };
  },
};

async function buildMeetingChatContext(contextKey: string): Promise<string | null> {
  const parts = contextKey.split("/").filter(Boolean);
  if (parts[0] !== "meetings") return null;

  if (parts[1]) {
    const meeting = await db.meeting.findFirst({
      where: { id: parts[1], deletedAt: null },
      include: {
        customer: { select: { name: true } },
        actionItems: { where: { deletedAt: null } },
      },
    });
    if (!meeting) return null;

    return [
      `Meeting: ${meeting.title}`,
      meeting.scheduledAt ? `Scheduled: ${meeting.scheduledAt.toISOString()}` : "",
      meeting.type ? `Type: ${meeting.type}` : "",
      meeting.status ? `Status: ${meeting.status}` : "",
      meeting.outcome ? `Outcome: ${meeting.outcome}` : "",
      meeting.customer ? `Customer: ${meeting.customer.name}` : "",
      meeting.agenda ? `Agenda:\n${meeting.agenda}` : "",
      meeting.outcomeReport ? `Outcome report:\n${meeting.outcomeReport}` : "",
      meeting.minutes ? `Minutes:\n${meeting.minutes}` : "",
      meeting.aiSummary ? `AI summary:\n${meeting.aiSummary}` : "",
      meeting.aiEvaluation ? `AI evaluation:\n${meeting.aiEvaluation}` : "",
      meeting.actionItems.length
        ? `Action items:\n${meeting.actionItems.map((a) => `- ${a.title}${a.completed ? " (done)" : ""}`).join("\n")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  const upcoming = await db.meeting.findMany({
    where: { deletedAt: null, status: "SCHEDULED", scheduledAt: { gte: new Date() } },
    take: 5,
    orderBy: { scheduledAt: "asc" },
    select: { title: true, scheduledAt: true, type: true, outcome: true },
  });

  const recent = await db.meeting.findMany({
    where: { deletedAt: null, status: "COMPLETED" },
    take: 5,
    orderBy: { scheduledAt: "desc" },
    select: { title: true, scheduledAt: true, outcome: true, aiSummary: true },
  });

  return [
    "Upcoming meetings:",
    upcoming.length
      ? upcoming
          .map((m) => `- ${m.title} (${m.scheduledAt?.toISOString() ?? "unscheduled"}, ${m.type})`)
          .join("\n")
      : "None scheduled.",
    "Recent completed meetings:",
    recent.length
      ? recent
          .map(
            (m) =>
              `- ${m.title} (${m.outcome})${m.aiSummary ? `: ${m.aiSummary.slice(0, 120)}` : ""}`
          )
          .join("\n")
      : "None completed yet.",
  ].join("\n\n");
}
