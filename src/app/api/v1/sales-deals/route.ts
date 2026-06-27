import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { createSalesDealSchema } from "@/lib/validations/revenue";
import { financeRepository } from "@/server/repositories/finance.repository";
import { auditLog } from "@/lib/logger/audit";

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, createSalesDealSchema);
  if (!parsed.ok) return parsed.response;
  const deal = await financeRepository.createSalesDeal(parsed.data, user.id);
  await auditLog({
    userId: user.id,
    action: "sales_deal.create",
    resource: "sales_deals",
    resourceId: deal.id,
    ipAddress: getClientIp(request),
  });
  return success(deal, "Deal saved.", 201);
}, "revenue.manage");
