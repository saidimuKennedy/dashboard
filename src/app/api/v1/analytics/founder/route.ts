import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { dashboardRepository } from "@/server/repositories/dashboard.repository";
import { aiService } from "@/server/ai/ai.service";

export const GET = withAuth(async (_request, { user }) => {
  const overview = await dashboardRepository.getOverview(user.id);
  const brief = await aiService.founderBrief();
  return success({ overview, brief });
});
