import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody } from "@/lib/api/helpers";
import { customerAliasSchema } from "@/lib/validations";
import { customerRepository } from "@/server/repositories/dashboard.repository";

export const GET = withAuth(async (_request, { params }) => {
  const customer = await customerRepository.getById(params!.id);
  if (!customer) return notFound("Customer not found.");
  const alias = customer.alias ?? (await customerRepository.getOrCreateAlias(customer.id, customer.industry));
  return success(alias);
}, "customer.manage");

export const PUT = withAuth(async (request, { params }) => {
  const customer = await customerRepository.getById(params!.id);
  if (!customer) return notFound("Customer not found.");
  const parsed = await parseBody(request, customerAliasSchema);
  if (!parsed.ok) return parsed.response;
  const alias = await customerRepository.upsertAlias(params!.id, parsed.data.alias.toUpperCase());
  return success(alias, "Alias updated.");
}, "customer.manage");
