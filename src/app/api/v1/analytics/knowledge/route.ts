import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { db } from "@/lib/db";

export const GET = withAuth(async () => {
  const [total, published, draft, byCategory] = await Promise.all([
    db.knowledgeArticle.count({ where: { deletedAt: null } }),
    db.knowledgeArticle.count({ where: { deletedAt: null, status: "PUBLISHED" } }),
    db.knowledgeArticle.count({ where: { deletedAt: null, status: "DRAFT" } }),
    db.knowledgeArticle.groupBy({ by: ["categoryId"], where: { deletedAt: null }, _count: true }),
  ]);
  return success({ total, published, draft, byCategory });
}, "knowledge.read");
