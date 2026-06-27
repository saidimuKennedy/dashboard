import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { db } from "@/lib/db";

export const GET = withAuth(async () => {
  const byStage = await db.researchTopic.groupBy({ by: ["stage"], where: { deletedAt: null }, _count: true });
  return success({ byStage });
}, "knowledge.read");
