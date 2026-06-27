import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody } from "@/lib/api/helpers";
import { createFinanceAccountSchema } from "@/lib/validations/revenue";
import { financeRepository } from "@/server/repositories/finance.repository";

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, createFinanceAccountSchema);
  if (!parsed.ok) return parsed.response;
  const customer = await financeRepository.createAccount(parsed.data, user.id);
  return success(customer, "Customer account created.", 201);
}, "revenue.manage");
