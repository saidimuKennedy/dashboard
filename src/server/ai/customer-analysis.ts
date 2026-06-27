import { z } from "zod";
import type { CustomerAiAnalysis, PortfolioCustomerInsight } from "@/types/customer";

const customerAnalysisSchema = z.object({
  dealScore: z.number().min(0).max(100),
  dealVerdict: z.enum(["excellent", "good", "fair", "at_risk"]),
  dealRationale: z.string(),
  productRecommendations: z.array(
    z.object({
      productName: z.string(),
      rationale: z.string(),
      fitScore: z.number().min(0).max(100),
    })
  ),
  contractAdvice: z.array(z.string()),
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

function fallbackAnalysis(alias: string): CustomerAiAnalysis {
  return {
    dealScore: 50,
    dealVerdict: "fair",
    dealRationale: "AI analysis unavailable. Review customer data manually.",
    productRecommendations: [],
    contractAdvice: ["Review contract terms and renewal timeline manually."],
    summary: `Analysis pending for ${alias}.`,
    analyzedAt: new Date().toISOString(),
  };
}

export async function analyzeCustomerProfile(
  callDeepSeek: (systemPrompt: string, userPrompt: string, temperature?: number) => Promise<{ content: string; tokens: number }>,
  maskedContext: string,
  alias: string,
  availableProducts: string[]
): Promise<{ analysis: CustomerAiAnalysis; tokens: number }> {
  const systemPrompt = `You are a customer success advisor for an African software company.
Analyze masked customer profiles (aliases only — never invent or request real names, emails, or phone numbers).
Respond ONLY with valid JSON (no markdown fences):
{
  "dealScore": 0-100,
  "dealVerdict": "excellent|good|fair|at_risk",
  "dealRationale": "why this customer is a good or risky deal",
  "productRecommendations": [{ "productName": "name from catalog", "rationale": "why", "fitScore": 0-100 }],
  "contractAdvice": ["actionable contract advice"],
  "summary": "executive summary"
}
Available products: ${availableProducts.join(", ") || "none listed"}`;

  try {
    const { content, tokens } = await callDeepSeek(systemPrompt, maskedContext, 0.2);
    const parsed = customerAnalysisSchema.parse(JSON.parse(extractJsonObject(content)));
    return {
      analysis: { ...parsed, analyzedAt: new Date().toISOString() },
      tokens,
    };
  } catch {
    return { analysis: fallbackAnalysis(alias), tokens: 0 };
  }
}

export async function analyzeCustomerPortfolio(
  callDeepSeek: (systemPrompt: string, userPrompt: string, temperature?: number) => Promise<{ content: string; tokens: number }>,
  maskedProfiles: string[]
): Promise<{ insights: PortfolioCustomerInsight[]; tokens: number }> {
  const systemPrompt = `You are a revenue strategist. Rank customers by deal quality using ONLY masked aliases.
Respond ONLY with valid JSON array (no markdown):
[{ "alias": "CLI-XXXX", "dealScore": 0-100, "dealVerdict": "excellent|good|fair|at_risk", "summary": "one line", "topProduct": "optional" }]
Sort by dealScore descending.`;

  try {
    const { content, tokens } = await callDeepSeek(
      systemPrompt,
      maskedProfiles.join("\n\n---\n\n"),
      0.2
    );
    const raw = JSON.parse(extractJsonObject(content));
    const items = Array.isArray(raw) ? raw : [];
    const insights: PortfolioCustomerInsight[] = items.map((item: Record<string, unknown>, index: number) => ({
      alias: String(item.alias ?? `Unknown-${index}`),
      customerId: "",
      dealScore: Number(item.dealScore ?? 0),
      dealVerdict: (item.dealVerdict as PortfolioCustomerInsight["dealVerdict"]) ?? "fair",
      summary: String(item.summary ?? ""),
      topProduct: item.topProduct ? String(item.topProduct) : undefined,
    }));
    return { insights, tokens };
  } catch {
    return { insights: [], tokens: 0 };
  }
}

export async function generateContractContent(
  callDeepSeek: (systemPrompt: string, userPrompt: string, temperature?: number) => Promise<{ content: string; tokens: number }>,
  maskedContext: string,
  terms: string,
  templateStyle: string
): Promise<{ content: string; tokens: number }> {
  const systemPrompt = `You are a legal contract drafter for a software company in Kenya.
Generate a professional service contract using ONLY the masked customer alias — never include real names, emails, or phone numbers.
Use placeholder "[CLIENT_ALIAS]" for the client party name.
Style: ${templateStyle}
Include: scope of work, payment terms, IP ownership, confidentiality, termination, governing law (Kenya).
Write in plain readable text only. Do NOT use markdown syntax — no # headers, no ** bold markers, no bullet dashes.
Use numbered sections like "1. SCOPE OF WORK" on their own line, then plain paragraphs below each section.`;

  const userPrompt = `Customer context (masked):\n${maskedContext}\n\nContract terms to incorporate:\n${terms}`;
  return callDeepSeek(systemPrompt, userPrompt, 0.3);
}
