import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { updateJournalSchema } from "@/lib/validations";
import { journalRepository } from "@/server/repositories/dashboard.repository";
import { auditLog } from "@/lib/logger/audit";
import { db } from "@/lib/db";

export const GET = withAuth(async (_request, { params }) => {
  const entry = await journalRepository.getById(params!.id);
  if (!entry) return notFound("Journal entry not found.");
  return success(entry);
});

export const PATCH = withAuth(async (request, { user, params }) => {
  const parsed = await parseBody(request, updateJournalSchema);
  if (!parsed.ok) return parsed.response;
  const existing = await db.journalEntry.findFirst({ where: { id: params!.id, deletedAt: null } });
  if (!existing) return notFound("Journal entry not found.");
  const entry = await journalRepository.update(params!.id, parsed.data, user.id);
  await auditLog({ userId: user.id, action: "journal.update", resource: "journal", resourceId: params!.id, ipAddress: getClientIp(request) });
  return success(entry, "Journal entry updated.");
});

export const DELETE = withAuth(async (request, { user, params }) => {
  const existing = await db.journalEntry.findFirst({ where: { id: params!.id, deletedAt: null } });
  if (!existing) return notFound("Journal entry not found.");
  await journalRepository.softDelete(params!.id, user.id);
  await auditLog({ userId: user.id, action: "journal.delete", resource: "journal", resourceId: params!.id, ipAddress: getClientIp(request) });
  return success(null, "Journal entry deleted.");
});
