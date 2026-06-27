import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";

const BASE = "/home/saidimu/Desktop/next/dashboard/src/app/api/v1";
function w(p, c) { const f = join(BASE, p); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, c.trimStart() + "\n"); return f; }

const R = {
"categories/route.ts": `import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { createCategorySchema } from "@/lib/validations";
import { auditLog } from "@/lib/logger/audit";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";

export const GET = withAuth(async () => {
  const items = await db.knowledgeCategory.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } });
  return success({ items });
}, "knowledge.read");

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, createCategorySchema);
  if ("error" in parsed) return parsed.error;
  const category = await db.knowledgeCategory.create({ data: { ...parsed.data, slug: slugify(parsed.data.name), createdBy: user.id } });
  await auditLog({ userId: user.id, action: "category.create", resource: "categories", resourceId: category.id, ipAddress: getClientIp(request) });
  return success(category, "Category created.", 201);
}, "knowledge.write");`,

"categories/[id]/route.ts": `import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { updateCategorySchema } from "@/lib/validations";
import { auditLog } from "@/lib/logger/audit";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";

export const PATCH = withAuth(async (request, { user, params }) => {
  const parsed = await parseBody(request, updateCategorySchema);
  if ("error" in parsed) return parsed.error;
  const existing = await db.knowledgeCategory.findFirst({ where: { id: params!.id, deletedAt: null } });
  if (!existing) return notFound("Category not found.");
  const category = await db.knowledgeCategory.update({
    where: { id: params!.id },
    data: { ...parsed.data, ...(parsed.data.name && { slug: slugify(parsed.data.name) }), updatedBy: user.id },
  });
  await auditLog({ userId: user.id, action: "category.update", resource: "categories", resourceId: category.id, ipAddress: getClientIp(request) });
  return success(category, "Category updated.");
}, "knowledge.write");

export const DELETE = withAuth(async (request, { user, params }) => {
  const existing = await db.knowledgeCategory.findFirst({ where: { id: params!.id, deletedAt: null } });
  if (!existing) return notFound("Category not found.");
  await db.knowledgeCategory.update({ where: { id: params!.id }, data: { deletedAt: new Date(), updatedBy: user.id } });
  await auditLog({ userId: user.id, action: "category.delete", resource: "categories", resourceId: params!.id, ipAddress: getClientIp(request) });
  return success(null, "Category deleted.");
}, "knowledge.delete");`,

"tags/route.ts": `import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { createTagSchema } from "@/lib/validations";
import { auditLog } from "@/lib/logger/audit";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";

export const GET = withAuth(async () => {
  const items = await db.tag.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } });
  return success({ items });
}, "knowledge.read");

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, createTagSchema);
  if ("error" in parsed) return parsed.error;
  const tag = await db.tag.create({ data: { name: parsed.data.name, slug: slugify(parsed.data.name) } });
  await auditLog({ userId: user.id, action: "tag.create", resource: "tags", resourceId: tag.id, ipAddress: getClientIp(request) });
  return success(tag, "Tag created.", 201);
}, "knowledge.write");`,

"tags/[id]/route.ts": `import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { updateTagSchema } from "@/lib/validations";
import { auditLog } from "@/lib/logger/audit";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";

export const PATCH = withAuth(async (request, { user, params }) => {
  const parsed = await parseBody(request, updateTagSchema);
  if ("error" in parsed) return parsed.error;
  const existing = await db.tag.findFirst({ where: { id: params!.id, deletedAt: null } });
  if (!existing) return notFound("Tag not found.");
  const tag = await db.tag.update({ where: { id: params!.id }, data: { ...parsed.data, ...(parsed.data.name && { slug: slugify(parsed.data.name) }) } });
  await auditLog({ userId: user.id, action: "tag.update", resource: "tags", resourceId: tag.id, ipAddress: getClientIp(request) });
  return success(tag, "Tag updated.");
}, "knowledge.write");

export const DELETE = withAuth(async (request, { user, params }) => {
  const existing = await db.tag.findFirst({ where: { id: params!.id, deletedAt: null } });
  if (!existing) return notFound("Tag not found.");
  await db.tag.update({ where: { id: params!.id }, data: { deletedAt: new Date() } });
  await auditLog({ userId: user.id, action: "tag.delete", resource: "tags", resourceId: params!.id, ipAddress: getClientIp(request) });
  return success(null, "Tag deleted.");
}, "knowledge.delete");`,

"research/route.ts": `import { NextRequest } from "next/server";
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
  if ("error" in parsed) return parsed.error;
  const topic = await researchRepository.create({ ...parsed.data, authorId: user.id });
  await auditLog({ userId: user.id, action: "research.create", resource: "research", resourceId: topic.id, ipAddress: getClientIp(request) });
  return success(topic, "Research topic created.", 201);
}, "knowledge.write");`,

"research/[id]/route.ts": `import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { updateResearchSchema } from "@/lib/validations";
import { researchRepository } from "@/server/repositories/dashboard.repository";
import { auditLog } from "@/lib/logger/audit";
import { db } from "@/lib/db";

export const PATCH = withAuth(async (request, { user, params }) => {
  const parsed = await parseBody(request, updateResearchSchema);
  if ("error" in parsed) return parsed.error;
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
}, "knowledge.delete");`,

"research/complete/route.ts": `import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { researchActionSchema } from "@/lib/validations";
import { researchRepository } from "@/server/repositories/dashboard.repository";
import { auditLog } from "@/lib/logger/audit";
import { db } from "@/lib/db";

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, researchActionSchema);
  if ("error" in parsed) return parsed.error;
  const existing = await db.researchTopic.findFirst({ where: { id: parsed.data.id, deletedAt: null } });
  if (!existing) return notFound("Research topic not found.");
  const topic = await researchRepository.update(parsed.data.id, { stage: "VALIDATED" }, user.id);
  await auditLog({ userId: user.id, action: "research.complete", resource: "research", resourceId: parsed.data.id, ipAddress: getClientIp(request) });
  return success(topic, "Research marked as complete.");
}, "knowledge.write");`,

"research/archive/route.ts": `import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { researchActionSchema } from "@/lib/validations";
import { researchRepository } from "@/server/repositories/dashboard.repository";
import { auditLog } from "@/lib/logger/audit";
import { db } from "@/lib/db";

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, researchActionSchema);
  if ("error" in parsed) return parsed.error;
  const existing = await db.researchTopic.findFirst({ where: { id: parsed.data.id, deletedAt: null } });
  if (!existing) return notFound("Research topic not found.");
  const topic = await researchRepository.update(parsed.data.id, { stage: "ARCHIVED" }, user.id);
  await auditLog({ userId: user.id, action: "research.archive", resource: "research", resourceId: parsed.data.id, ipAddress: getClientIp(request) });
  return success(topic, "Research archived.");
}, "knowledge.write");`,

"research/summarize/route.ts": `import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody } from "@/lib/api/helpers";
import { researchSummarizeSchema } from "@/lib/validations";
import { aiService } from "@/server/ai/ai.service";
import { db } from "@/lib/db";

export const POST = withAuth(async (request) => {
  const parsed = await parseBody(request, researchSummarizeSchema);
  if ("error" in parsed) return parsed.error;
  const topic = await db.researchTopic.findFirst({ where: { id: parsed.data.id, deletedAt: null } });
  if (!topic) return notFound("Research topic not found.");
  const content = [topic.title, topic.description, topic.notes].filter(Boolean).join("\\n");
  const result = await aiService.summarize(content, "research");
  return success(result);
}, "ai.use");`,

"meetings/route.ts": `import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody, getClientIp, paginatedData } from "@/lib/api/helpers";
import { parsePagination } from "@/lib/api/response";
import { createMeetingSchema } from "@/lib/validations";
import { meetingRepository } from "@/server/repositories/domains.repository";
import { auditLog } from "@/lib/logger/audit";

export const GET = withAuth(async (request) => {
  const { page, limit, skip } = parsePagination(request.nextUrl.searchParams);
  const { items, total } = await meetingRepository.list(skip, limit);
  return success(paginatedData(items, total, page, limit));
});

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, createMeetingSchema);
  if ("error" in parsed) return parsed.error;
  const meeting = await meetingRepository.create({ ...parsed.data, creatorId: user.id });
  await auditLog({ userId: user.id, action: "meeting.create", resource: "meetings", resourceId: meeting.id, ipAddress: getClientIp(request) });
  return success(meeting, "Meeting created.", 201);
});`,

"meetings/[id]/route.ts": `import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { updateMeetingSchema } from "@/lib/validations";
import { meetingRepository } from "@/server/repositories/domains.repository";
import { auditLog } from "@/lib/logger/audit";

export const PATCH = withAuth(async (request, { user, params }) => {
  const parsed = await parseBody(request, updateMeetingSchema);
  if ("error" in parsed) return parsed.error;
  const existing = await meetingRepository.getById(params!.id);
  if (!existing) return notFound("Meeting not found.");
  const meeting = await meetingRepository.update(params!.id, parsed.data, user.id);
  await auditLog({ userId: user.id, action: "meeting.update", resource: "meetings", resourceId: params!.id, ipAddress: getClientIp(request) });
  return success(meeting, "Meeting updated.");
});

export const DELETE = withAuth(async (request, { user, params }) => {
  const existing = await meetingRepository.getById(params!.id);
  if (!existing) return notFound("Meeting not found.");
  await meetingRepository.softDelete(params!.id, user.id);
  await auditLog({ userId: user.id, action: "meeting.delete", resource: "meetings", resourceId: params!.id, ipAddress: getClientIp(request) });
  return success(null, "Meeting deleted.");
});`,

"meetings/transcribe/route.ts": `import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { meetingTranscribeSchema } from "@/lib/validations";
import { meetingRepository } from "@/server/repositories/domains.repository";
import { auditLog } from "@/lib/logger/audit";

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, meetingTranscribeSchema);
  if ("error" in parsed) return parsed.error;
  const meeting = await meetingRepository.getById(parsed.data.meetingId);
  if (!meeting) return notFound("Meeting not found.");
  const transcript = parsed.data.transcript ?? "[Transcription stub — audio processing not configured]";
  const updated = await meetingRepository.update(parsed.data.meetingId, { transcript }, user.id);
  await auditLog({ userId: user.id, action: "meeting.transcribe", resource: "meetings", resourceId: parsed.data.meetingId, ipAddress: getClientIp(request) });
  return success(updated, "Meeting transcribed.");
});`,

"meetings/summary/route.ts": `import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody } from "@/lib/api/helpers";
import { meetingSummarySchema } from "@/lib/validations";
import { meetingRepository } from "@/server/repositories/domains.repository";
import { aiService } from "@/server/ai/ai.service";

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, meetingSummarySchema);
  if ("error" in parsed) return parsed.error;
  const meeting = await meetingRepository.getById(parsed.data.meetingId);
  if (!meeting) return notFound("Meeting not found.");
  const content = meeting.transcript ?? meeting.minutes ?? meeting.agenda ?? meeting.title;
  const result = await aiService.summarize(content, "meeting");
  await meetingRepository.update(parsed.data.meetingId, { aiSummary: result.response }, user.id);
  return success(result);
}, "ai.use");`,

"meetings/action-items/route.ts": `import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody } from "@/lib/api/helpers";
import { meetingActionItemsSchema } from "@/lib/validations";
import { meetingRepository } from "@/server/repositories/domains.repository";
import { aiService } from "@/server/ai/ai.service";
import { db } from "@/lib/db";

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, meetingActionItemsSchema);
  if ("error" in parsed) return parsed.error;
  const meeting = await meetingRepository.getById(parsed.data.meetingId);
  if (!meeting) return notFound("Meeting not found.");
  const content = parsed.data.transcript ?? meeting.transcript ?? meeting.minutes ?? "";
  const result = await aiService.summarize(content, "action-items");
  const items = result.response.split("\\n").filter(Boolean).map((title) => ({ title, meetingId: parsed.data.meetingId, createdBy: user.id }));
  if (items.length) await db.actionItem.createMany({ data: items });
  return success({ actionItems: items, summary: result.response });
}, "ai.use");`,
};

console.log(Object.entries(R).map(([p,c]) => w(p,c)).join("\n"));
