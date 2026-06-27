import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { customerRepository } from "@/server/repositories/dashboard.repository";
import { aiService } from "@/server/ai/ai.service";
import { buildCustomerMaskedContext, buildPiiProfile } from "@/server/customers/customer-context";

export const GET = withAuth(async () => {
  const customers = await customerRepository.listForPortfolio();
  const maskedProfiles: { customerId: string; alias: string; context: string }[] = [];

  for (const customer of customers) {
    const aliasRecord = customer.alias ?? (await customerRepository.getOrCreateAlias(customer.id, customer.industry));
    const profile = buildPiiProfile(customer, aliasRecord.alias);
    const context = buildCustomerMaskedContext(profile, customer);
    maskedProfiles.push({ customerId: customer.id, alias: aliasRecord.alias, context });
  }

  const { insights, tokens } = await aiService.analyzePortfolio(
    maskedProfiles.map((p) => p.context)
  );

  const enriched = insights.map((insight, index) => {
    const match = maskedProfiles.find((p) => p.alias === insight.alias) ?? maskedProfiles[index];
    return {
      ...insight,
      customerId: match?.customerId ?? "",
      dealRank: index + 1,
    };
  });

  return success({ insights: enriched, tokens });
}, "ai.use");
