import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { isAdmin } from "@/lib/permissions";
import { ensureDefaultServiceProducts } from "@/lib/finance/ensure-defaults";
import {
  getRevenueByAcquisitionSource,
  getRevenueByIndustry,
  getRevenueCenterSnapshot,
} from "@/lib/finance/reports";
import { financeRepository } from "@/server/repositories/finance.repository";

export const GET = withAuth(async (_request, { user }) => {
  await ensureDefaultServiceProducts();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const canRevealPii = isAdmin(user.role);

  const [snapshot, byIndustry, bySource, formOptions] = await Promise.all([
    getRevenueCenterSnapshot(canRevealPii),
    getRevenueByIndustry(monthStart, monthEnd),
    getRevenueByAcquisitionSource(monthStart, monthEnd),
    financeRepository.listFormOptions(),
  ]);

  return success({
    snapshot,
    breakdown: {
      byIndustry: byIndustry.map((r) => ({ label: r.industry, amount: r.amount })),
      bySource: bySource.map((r) => ({ label: r.source, amount: r.amount })),
    },
    formOptions,
    canRevealPii,
    canWrite: true,
  });
}, "revenue.manage");
