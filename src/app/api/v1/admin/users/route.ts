import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parsePagination } from "@/lib/api/response";
import { paginatedData } from "@/lib/api/helpers";
import { db } from "@/lib/db";

export const GET = withAuth(async (request) => {
  const { page, limit, skip } = parsePagination(request.nextUrl.searchParams);
  const where = { deletedAt: null };
  const [items, total] = await Promise.all([
    db.user.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" }, select: { id: true, email: true, firstName: true, lastName: true, role: true, status: true, lastLogin: true, createdAt: true } }),
    db.user.count({ where }),
  ]);
  return success(paginatedData(items, total, page, limit));
}, "admin.access");
