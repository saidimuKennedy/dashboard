import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody } from "@/lib/api/helpers";
import { createContractSchema, updateContractSchema } from "@/lib/validations";
import {
  customerContractRepository,
  customerRepository,
} from "@/server/repositories/dashboard.repository";
import { serializeContract } from "@/server/customers/customer-context";
import { getClientIp } from "@/lib/api/helpers";
import { auditLog } from "@/lib/logger/audit";

export const GET = withAuth(async (_request, { params }) => {
  const customer = await customerRepository.getById(params!.id);
  if (!customer) return notFound("Customer not found.");
  const contracts = await customerContractRepository.listByCustomer(params!.id);
  return success(contracts.map(serializeContract));
}, "customer.manage");

export const POST = withAuth(async (request, { user, params }) => {
  const customer = await customerRepository.getById(params!.id);
  if (!customer) return notFound("Customer not found.");

  const parsed = await parseBody(request, createContractSchema);
  if (!parsed.ok) return parsed.response;

  const { parentId, isRetainer, value, ...rest } = parsed.data;
  const contract = await customerContractRepository.create(
    params!.id,
    {
      ...rest,
      value: value ?? undefined,
      isRetainer: isRetainer ?? false,
      ...(parentId ? { parent: { connect: { id: parentId } } } : {}),
    },
    user.id
  );

  await auditLog({
    userId: user.id,
    action: "customer.contract.create",
    resource: "customer_contracts",
    resourceId: contract.id,
    ipAddress: getClientIp(request),
  });

  return success(serializeContract(contract), "Contract created.");
}, "customer.manage");

export const PATCH = withAuth(async (request, { user, params }) => {
  const url = new URL(request.url);
  const contractId = url.searchParams.get("contractId");
  if (!contractId) return success(null, "contractId query param required.");

  const existing = await customerContractRepository.getById(contractId);
  if (!existing || existing.customerId !== params!.id) return notFound("Contract not found.");

  const parsed = await parseBody(request, updateContractSchema);
  if (!parsed.ok) return parsed.response;

  const contract = await customerContractRepository.update(contractId, parsed.data, user.id);
  return success(serializeContract(contract), "Contract updated.");
}, "customer.manage");
