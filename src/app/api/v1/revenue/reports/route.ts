import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { db } from "@/lib/db";

export const GET = withAuth(async () => {
  const [total, byType, recent] = await Promise.all([
    db.revenueEntry.aggregate({ where: { deletedAt: null }, _sum: { amount: true }, _count: true }),
    db.revenueEntry.groupBy({ by: ["type"], where: { deletedAt: null }, _sum: { amount: true }, _count: true }),
    db.revenueEntry.findMany({ where: { deletedAt: null }, take: 10, orderBy: { recordedAt: "desc" } }),
  ]);
  return success({ total: Number(total._sum.amount ?? 0), count: total._count, byType, recent });
}, "revenue.manage");
