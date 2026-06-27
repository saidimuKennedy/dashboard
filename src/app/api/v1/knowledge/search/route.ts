import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody } from "@/lib/api/helpers";
import { knowledgeSearchSchema } from "@/lib/validations";
import { knowledgeRepository } from "@/server/repositories/knowledge.repository";

export const POST = withAuth(async (request) => {
  const parsed = await parseBody(request, knowledgeSearchSchema);
  if (!parsed.ok) return parsed.response;
  const results = await knowledgeRepository.search(parsed.data.query, parsed.data.limit ?? 20);
  return success({ results });
}, "knowledge.read");
