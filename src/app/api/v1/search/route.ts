import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody } from "@/lib/api/helpers";
import { searchSchema } from "@/lib/validations";
import { ragRetrieval } from "@/server/ai/rag/retrieval.service";
import { db } from "@/lib/db";

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, searchSchema);
  if (!parsed.ok) return parsed.response;
  const limit = parsed.data.limit ?? 20;
  const results = await ragRetrieval.hybridSearch(parsed.data.query, {
    limit,
    userRole: user.role,
    userId: user.id,
  });

  const grouped = results.reduce<Record<string, typeof results>>((acc, item) => {
    const key = item.type;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  await db.searchLog.create({
    data: {
      userId: user.id,
      query: parsed.data.query,
      type: parsed.data.type ?? "all",
      results: results.length,
    },
  });

  return success({ results: grouped, items: results });
});
