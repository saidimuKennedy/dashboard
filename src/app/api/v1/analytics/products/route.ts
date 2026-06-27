import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { db } from "@/lib/db";

export const GET = withAuth(async () => {
  const [total, releases, ideas] = await Promise.all([
    db.product.count({ where: { deletedAt: null } }),
    db.productRelease.count(),
    db.idea.count(),
  ]);
  return success({ total, releases, ideas });
});
