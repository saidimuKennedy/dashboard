import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { db } from "@/lib/db";

export const GET = withAuth(async () => {
  const popular = await db.searchLog.groupBy({
    by: ["query"],
    _count: { query: true },
    orderBy: { _count: { query: "desc" } },
    take: 20,
  });
  return success({
    queries: popular.map((p: { query: string; _count: { query: number } }) => ({
      query: p.query,
      count: p._count.query,
    })),
  });
});
