import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { dashboardRepository } from "@/server/repositories/dashboard.repository";
import { complianceRepository } from "@/server/repositories/domains.repository";

export const GET = withAuth(async (_request, { user }) => {
  const [overview, complianceScore] = await Promise.all([
    dashboardRepository.getOverview(user.id),
    complianceRepository.getScore(),
  ]);
  return success({ ...overview, complianceScore });
});
