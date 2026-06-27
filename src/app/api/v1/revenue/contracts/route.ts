import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody } from "@/lib/api/helpers";
import { createFinanceContractSchema } from "@/lib/validations/revenue";
import { financeRepository } from "@/server/repositories/finance.repository";

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, createFinanceContractSchema);
  if (!parsed.ok) return parsed.response;

  const { customerId, productId, mrr, endDate, startDate, autoRenew, status } = parsed.data;
  const contract = await financeRepository.createContract(
    {
      customerId,
      productId,
      title: parsed.data.title ?? `Service contract — ${mrr} KES/mo`,
      startDate,
      endDate,
      mrr,
      autoRenew,
      status,
    },
    user.id
  );
  return success(contract, "Contract created.", 201);
}, "revenue.manage");
