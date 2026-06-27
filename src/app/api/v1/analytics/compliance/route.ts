import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { complianceRepository } from "@/server/repositories/domains.repository";
import { db } from "@/lib/db";

export const GET = withAuth(async () => {
  const [score, byStatus, upcoming] = await Promise.all([
    complianceRepository.getScore(),
    db.complianceItem.groupBy({ by: ["status"], where: { deletedAt: null }, _count: true }),
    complianceRepository.getDeadlines(30),
  ]);
  return success({ score, byStatus, upcoming });
}, "compliance.manage");
