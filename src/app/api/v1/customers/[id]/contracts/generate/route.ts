import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody } from "@/lib/api/helpers";
import { generateContractSchema } from "@/lib/validations";
import {
  contractSettingsRepository,
  customerContractRepository,
  customerRepository,
} from "@/server/repositories/dashboard.repository";
import { aiService } from "@/server/ai/ai.service";
import {
  buildCustomerMaskedContext,
  buildPiiProfile,
  serializeContract,
} from "@/server/customers/customer-context";

export const POST = withAuth(async (request, { user, params }) => {
  const customer = await customerRepository.getById(params!.id);
  if (!customer) return notFound("Customer not found.");

  const parsed = await parseBody(request, generateContractSchema);
  if (!parsed.ok) return parsed.response;

  const aliasRecord = customer.alias ?? (await customerRepository.getOrCreateAlias(customer.id, customer.industry));
  const profile = buildPiiProfile(customer, aliasRecord.alias);
  const maskedContext = buildCustomerMaskedContext(profile, customer);
  const settings = await contractSettingsRepository.get();

  const templateStyle = `Header color: ${settings.headerColor}, accent: ${settings.accentColor}, font: ${settings.fontFamily}, company: ${settings.companyName}, footer: ${settings.footerText}`;

  const { content, tokens } = await aiService.generateCustomerContract(
    profile,
    maskedContext,
    parsed.data.terms,
    templateStyle
  );

  const contract = await customerContractRepository.create(
    params!.id,
    {
      title: parsed.data.title ?? `Service Agreement — ${aliasRecord.alias}`,
      terms: parsed.data.terms,
      content,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      value: parsed.data.value,
      status: "DRAFT",
    },
    user.id
  );

  return success({ contract: serializeContract(contract), tokens, alias: aliasRecord.alias }, "Contract generated.");
}, "ai.use");
