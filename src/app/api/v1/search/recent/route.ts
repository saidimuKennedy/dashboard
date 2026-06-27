import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parsePagination } from "@/lib/api/response";
import { paginatedData } from "@/lib/api/helpers";
import { db } from "@/lib/db";

export const GET = withAuth(async (request, { user }) => {
  const { page, limit, skip } = parsePagination(request.nextUrl.searchParams);
  const where = { userId: user.id };
  const [items, total] = await Promise.all([
    db.searchLog.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" }, distinct: ["query"] }),
    db.searchLog.count({ where }),
  ]);
  return success(paginatedData(items, total, page, limit));
});
