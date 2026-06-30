import { db } from "@/lib/db";
import { getDeepSeekApiKey } from "@/lib/ai/deepseek";
import { buildChatContext, buildFounderBriefContext } from "@/server/ai/rag/context-builder";
import { ragRetrieval } from "@/server/ai/rag/retrieval.service";
import type { UserRole } from "@prisma/client";
import { analyzeResearchFromChat } from "@/server/ai/research-analysis";
import { analyzeJournalFromChat } from "@/server/ai/journal-analysis";
import { evaluateMeetingFromReport } from "@/server/ai/meeting-analysis";
import {
  analyzeDecisionFromChat,
  extractDecisionsFromMeeting,
  runDecisionPremortem,
  summarizeSimilarDecisions,
} from "@/server/ai/decision-analysis";
import {
  analyzeCustomerProfile,
  analyzeCustomerPortfolio,
  generateContractContent,
} from "@/server/ai/customer-analysis";
import {
  assertNoPii,
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
  userRole?: UserRole;
};

export type AiResponse = {
  response: string;
  sources: { id: string; title: string; type: string; excerpt?: string; score?: number; url?: string }[];
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
  decision_assistant: "You are a decision-log coach for a founder. Help clarify context, alternatives, tradeoffs, and reasoning before logging a decision. Ask probing questions about assumptions, risks, and when to revisit the choice.",
  customer_success_advisor: "You are a customer success advisor. Discuss customers ONLY by their assigned alias. Never ask for or reference real names, emails, phone numbers, or company names. Provide deal insights, product recommendations, and contract advice based on masked profile data.",
};

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
    const userRole = request.userRole ?? "FOUNDER";

    const { contextBlock, sources } = await buildChatContext({
      prompt: request.prompt,
      contextKey: request.contextKey,
      extraContext: request.context ?? [],
      userRole,
      userId,
    });

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
      sources: sources.map((s) => ({
        id: s.id,
        title: s.title,
        type: s.type,
        excerpt: s.excerpt,
        score: s.score,
        url: s.url,
      })),
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

  async founderBrief(userRole: UserRole = "FOUNDER"): Promise<AiResponse> {
    const context = await buildFounderBriefContext(userRole);
    const prompt = `Generate a concise daily executive brief for the founder using the context below.\n\n${context}`;
    return this.chat("system", { prompt, persona: "founder_brief", userRole });
  },

  async searchSemantic(query: string, userRole: UserRole = "FOUNDER", contextKey?: string) {
    const sources = await ragRetrieval.hybridSearch(query, {
      limit: 10,
      userRole,
      contextKey,
    });
    return sources.map((s) => ({
      id: s.id,
      title: s.title,
      type: s.type,
      excerpt: s.excerpt,
      score: s.score,
      url: s.url,
    }));
  },

  async analyzeResearchChat(messages: ResearchChatMessage[]) {
    return analyzeResearchFromChat(callDeepSeek, messages);
  },

  async analyzeJournalChat(messages: ResearchChatMessage[]) {
    return analyzeJournalFromChat(callDeepSeek, messages);
  },

  async analyzeDecisionChat(messages: ResearchChatMessage[]) {
    return analyzeDecisionFromChat(callDeepSeek, messages);
  },

  async extractMeetingDecisions(meeting: {
    title: string;
    agenda?: string | null;
    outcomeReport?: string | null;
    minutes?: string | null;
    transcript?: string | null;
    aiSummary?: string | null;
  }) {
    return extractDecisionsFromMeeting(callDeepSeek, meeting);
  },

  async premortemDecision(input: {
    title: string;
    context: string;
    decision: string;
    alternatives?: string;
    reasoning?: string;
  }) {
    return runDecisionPremortem(callDeepSeek, input);
  },

  async findSimilarDecisions(
    query: { title: string; context: string; decision: string },
    excludeId?: string
  ) {
    const { decisionRepository } = await import("@/server/repositories/domains.repository");
    const candidates = await decisionRepository.findSimilar(query, excludeId, 5);
    if (!candidates.length) return { items: [], tokens: 0 };

    const { relevance, tokens } = await summarizeSimilarDecisions(
      callDeepSeek,
      query,
      candidates.map((c) => ({
        title: c.title,
        decision: c.decision,
        outcome: c.outcome,
      }))
    );

    return {
      items: candidates.map((c, i) => ({
        ...c,
        relevance: relevance[i] ?? "Related past decision.",
      })),
      tokens,
    };
  },

  async chatWithMaskedCustomer(
    userId: string,
    profile: PiiProfile,
    maskedContext: string,
    prompt: string,
    conversationId?: string,
    customerId?: string,
    userRole: UserRole = "FOUNDER"
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
      userRole,
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
