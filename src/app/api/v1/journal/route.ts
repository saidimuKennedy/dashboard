import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody, getClientIp, paginatedData } from "@/lib/api/helpers";
import { parsePagination } from "@/lib/api/response";
import { createJournalSchema } from "@/lib/validations";
import { journalRepository } from "@/server/repositories/dashboard.repository";
import { auditLog } from "@/lib/logger/audit";

export const GET = withAuth(async (request, { user }) => {
  const { page, limit, skip } = parsePagination(request.nextUrl.searchParams);
  const { items, total } = await journalRepository.list(user.id, skip, limit);
  return success(paginatedData(items, total, page, limit));
});

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, createJournalSchema);
  if (!parsed.ok) return parsed.response;
  const entry = await journalRepository.create({ ...parsed.data, authorId: user.id });
  await auditLog({ userId: user.id, action: "journal.create", resource: "journal", resourceId: entry.id, ipAddress: getClientIp(request) });
  return success(entry, "Journal entry created.", 201);
});
