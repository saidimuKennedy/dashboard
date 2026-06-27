import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { knowledgeRelatedSchema } from "@/lib/validations";
import { db } from "@/lib/db";

export const GET = withAuth(async (request) => {
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = knowledgeRelatedSchema.safeParse(params);
  if (!parsed.success) return success({ items: [] });
  const limit = parsed.data.limit ?? 5;
  const items = await db.knowledgeArticle.findMany({
    where: {
      deletedAt: null,
      ...(parsed.data.id && { id: { not: parsed.data.id } }),
      ...(parsed.data.categoryId && { categoryId: parsed.data.categoryId }),
    },
    take: limit,
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, slug: true, summary: true, status: true },
  });
  return success({ items });
}, "knowledge.read");
