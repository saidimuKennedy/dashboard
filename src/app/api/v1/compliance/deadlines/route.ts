import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { complianceRepository } from "@/server/repositories/domains.repository";

export const GET = withAuth(async (request) => {
  const days = parseInt(request.nextUrl.searchParams.get("days") ?? "30", 10);
  const deadlines = await complianceRepository.getDeadlines(days);
  return success({ deadlines });
}, "compliance.manage");
