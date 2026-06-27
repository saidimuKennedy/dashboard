import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { revenueRepository } from "@/server/repositories/domains.repository";

export const GET = withAuth(async () => {
  const mrr = await revenueRepository.getMrr();
  return success({ mrr, currency: "KES" });
}, "revenue.manage");
