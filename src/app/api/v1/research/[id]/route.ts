import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { updateResearchSchema } from "@/lib/validations";
import { researchRepository } from "@/server/repositories/dashboard.repository";
import { auditLog } from "@/lib/logger/audit";
import { db } from "@/lib/db";

export const GET = withAuth(async (_request, { params }) => {
  const topic = await researchRepository.getById(params!.id);
  if (!topic) return notFound("Research topic not found.");
  return success(topic);
}, "knowledge.read");

export const PATCH = withAuth(async (request, { user, params }) => {
  const parsed = await parseBody(request, updateResearchSchema);
  if (!parsed.ok) return parsed.response;
  const existing = await db.researchTopic.findFirst({ where: { id: params!.id, deletedAt: null } });
  if (!existing) return notFound("Research topic not found.");
  const topic = await researchRepository.update(params!.id, parsed.data, user.id);
  await auditLog({ userId: user.id, action: "research.update", resource: "research", resourceId: params!.id, ipAddress: getClientIp(request) });
  return success(topic, "Research topic updated.");
}, "knowledge.write");

export const DELETE = withAuth(async (request, { user, params }) => {
  const existing = await db.researchTopic.findFirst({ where: { id: params!.id, deletedAt: null } });
  if (!existing) return notFound("Research topic not found.");
  await researchRepository.softDelete(params!.id, user.id);
  await auditLog({ userId: user.id, action: "research.delete", resource: "research", resourceId: params!.id, ipAddress: getClientIp(request) });
  return success(null, "Research topic deleted.");
}, "knowledge.delete");
