import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { dashboardRepository } from "@/server/repositories/dashboard.repository";
import { complianceRepository } from "@/server/repositories/domains.repository";

export const GET = withAuth(async () => {
  const [overview, complianceScore] = await Promise.all([
    dashboardRepository.getOverview(),
    complianceRepository.getScore(),
  ]);
  return success({ ...overview, complianceScore });
});
