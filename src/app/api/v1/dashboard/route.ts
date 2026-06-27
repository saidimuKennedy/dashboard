import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { dashboardRepository } from "@/server/repositories/dashboard.repository";

export const GET = withAuth(async () => {
  const data = await dashboardRepository.getOverview();
  return success(data);
});
