import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { researchActionSchema } from "@/lib/validations";
import { researchRepository } from "@/server/repositories/dashboard.repository";
import { auditLog } from "@/lib/logger/audit";
import { db } from "@/lib/db";

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, researchActionSchema);
  if (!parsed.ok) return parsed.response;
  const existing = await db.researchTopic.findFirst({ where: { id: parsed.data.id, deletedAt: null } });
  if (!existing) return notFound("Research topic not found.");
  const topic = await researchRepository.update(parsed.data.id, { stage: "ARCHIVED" }, user.id);
  await auditLog({ userId: user.id, action: "research.archive", resource: "research", resourceId: parsed.data.id, ipAddress: getClientIp(request) });
  return success(topic, "Research archived.");
}, "knowledge.write");
