import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parsePagination } from "@/lib/api/response";
import { paginatedData } from "@/lib/api/helpers";
import { db } from "@/lib/db";

export const GET = withAuth(async (request) => {
  const { page, limit, skip } = parsePagination(request.nextUrl.searchParams);
  const [items, total] = await Promise.all([
    db.auditLog.findMany({ skip, take: limit, orderBy: { createdAt: "desc" }, include: { user: { select: { email: true, firstName: true, lastName: true } } } }),
    db.auditLog.count(),
  ]);
  return success(paginatedData(items, total, page, limit));
}, "admin.access");
