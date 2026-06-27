import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody } from "@/lib/api/helpers";
import { journalReflectSchema } from "@/lib/validations";
import { aiService } from "@/server/ai/ai.service";
import { journalRepository } from "@/server/repositories/dashboard.repository";
import { db } from "@/lib/db";

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, journalReflectSchema);
  if (!parsed.ok) return parsed.response;
  let content = parsed.data.content;
  if (parsed.data.id) {
    const entry = await db.journalEntry.findFirst({ where: { id: parsed.data.id, deletedAt: null } });
    if (!entry) return notFound("Journal entry not found.");
    content = entry.content;
  }
  const result = await aiService.summarize(content!, "journal");
  if (parsed.data.id) await journalRepository.update(parsed.data.id, { aiSummary: result.response }, user.id);
  return success(result);
}, "ai.use");
