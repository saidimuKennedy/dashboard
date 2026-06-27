import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { revenueRepository } from "@/server/repositories/domains.repository";

export const GET = withAuth(async () => {
  const forecast = await revenueRepository.getForecast();
  return success(forecast);
}, "revenue.manage");
