import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody } from "@/lib/api/helpers";
import { customerChatSchema } from "@/lib/validations";
import { customerRepository } from "@/server/repositories/dashboard.repository";
import { aiService } from "@/server/ai/ai.service";
import { buildCustomerMaskedContext, buildPiiProfile } from "@/server/customers/customer-context";
import { db } from "@/lib/db";

export const POST = withAuth(async (request, { user, params }) => {
  const customer = await customerRepository.getById(params!.id);
  if (!customer) return notFound("Customer not found.");

  const parsed = await parseBody(request, customerChatSchema);
  if (!parsed.ok) return parsed.response;

  const aliasRecord = customer.alias ?? (await customerRepository.getOrCreateAlias(customer.id, customer.industry));
  const profile = buildPiiProfile(customer, aliasRecord.alias);
  const maskedContext = buildCustomerMaskedContext(profile, customer);

  const result = await aiService.chatWithMaskedCustomer(
    user.id,
    profile,
    maskedContext,
    parsed.data.prompt,
    parsed.data.conversationId,
    params!.id
  );

  return success({ ...result, alias: aliasRecord.alias });
}, "ai.use");

export const GET = withAuth(async (_request, { user, params }) => {
  const conversations = await db.aiConversation.findMany({
    where: { userId: user.id, contextKey: `/customers/${params!.id}` },
    orderBy: { updatedAt: "desc" },
    take: 10,
    select: { id: true, title: true, updatedAt: true },
  });
  return success(conversations);
}, "ai.use");
