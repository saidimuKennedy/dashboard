import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody } from "@/lib/api/helpers";
import { searchSchema } from "@/lib/validations";
import { knowledgeRepository } from "@/server/repositories/knowledge.repository";
import { db } from "@/lib/db";

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, searchSchema);
  if (!parsed.ok) return parsed.response;
  const limit = parsed.data.limit ?? 20;
  const results: Record<string, unknown[]> = {};
  if (!parsed.data.type || parsed.data.type === "all" || parsed.data.type === "knowledge") {
    results.knowledge = await knowledgeRepository.search(parsed.data.query, limit);
  }
  if (!parsed.data.type || parsed.data.type === "all" || parsed.data.type === "customers") {
    results.customers = (await db.customer.findMany({
      where: { deletedAt: null, OR: [{ name: { contains: parsed.data.query, mode: "insensitive" } }, { company: { contains: parsed.data.query, mode: "insensitive" } }] },
      take: limit,
    }));
  }
  await db.searchLog.create({ data: { userId: user.id, query: parsed.data.query, type: parsed.data.type ?? "all", results: Object.values(results).flat().length } });
  return success({ results });
});
