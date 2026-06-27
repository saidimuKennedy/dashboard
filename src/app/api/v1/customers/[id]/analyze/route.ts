import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { customerRepository } from "@/server/repositories/dashboard.repository";
import { aiService } from "@/server/ai/ai.service";
import { buildCustomerMaskedContext, buildPiiProfile } from "@/server/customers/customer-context";
import { db } from "@/lib/db";

export const POST = withAuth(async (_request, { params }) => {
  const customer = await customerRepository.getById(params!.id);
  if (!customer) return notFound("Customer not found.");

  const aliasRecord = customer.alias ?? (await customerRepository.getOrCreateAlias(customer.id, customer.industry));
  const profile = buildPiiProfile(customer, aliasRecord.alias);
  const maskedContext = buildCustomerMaskedContext(profile, customer);

  const products = await db.product.findMany({
    where: { deletedAt: null },
    select: { name: true },
  });

  const { analysis, tokens } = await aiService.analyzeCustomer(
    profile,
    maskedContext,
    aliasRecord.alias,
    products.map((p) => p.name)
  );

  await customerRepository.updateAiAnalysis(params!.id, analysis);

  return success({ analysis, tokens, alias: aliasRecord.alias });
}, "ai.use");
