import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { revenueRepository } from "@/server/repositories/domains.repository";
import { db } from "@/lib/db";

export const GET = withAuth(async () => {
  const [mrr, forecast, total] = await Promise.all([
    revenueRepository.getMrr(),
    revenueRepository.getForecast(),
    db.revenueEntry.aggregate({ where: { deletedAt: null }, _sum: { amount: true } }),
  ]);
  return success({ mrr, forecast, total: Number(total._sum.amount ?? 0) });
}, "revenue.manage");
