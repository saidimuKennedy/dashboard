import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody, getClientIp, paginatedData } from "@/lib/api/helpers";
import { parsePagination } from "@/lib/api/response";
import { createResearchSchema } from "@/lib/validations";
import { researchRepository } from "@/server/repositories/dashboard.repository";
import { auditLog } from "@/lib/logger/audit";
import { ResearchStage } from "@prisma/client";

export const GET = withAuth(async (request) => {
  const { page, limit, skip } = parsePagination(request.nextUrl.searchParams);
  const stage = request.nextUrl.searchParams.get("stage") as ResearchStage | null;
  const { items, total } = await researchRepository.list(skip, limit, stage ?? undefined);
  return success(paginatedData(items, total, page, limit));
}, "knowledge.read");

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, createResearchSchema);
  if (!parsed.ok) return parsed.response;
  const topic = await researchRepository.create({ ...parsed.data, authorId: user.id });
  await auditLog({ userId: user.id, action: "research.create", resource: "research", resourceId: topic.id, ipAddress: getClientIp(request) });
  return success(topic, "Research topic created.", 201);
}, "knowledge.write");
