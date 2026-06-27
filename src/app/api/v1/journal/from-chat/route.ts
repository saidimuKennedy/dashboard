import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { journalFromChatSchema } from "@/lib/validations";
import { journalRepository } from "@/server/repositories/dashboard.repository";
import { auditLog } from "@/lib/logger/audit";
import { aiService } from "@/server/ai/ai.service";

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, journalFromChatSchema);
  if (!parsed.ok) return parsed.response;

  const { messages } = parsed.data;
  const { analysis, tokens } = await aiService.analyzeJournalChat(messages);

  const entry = await journalRepository.create({
    authorId: user.id,
    content: analysis.content,
    mood: analysis.mood,
    wins: analysis.wins,
    challenges: analysis.challenges,
    lessons: analysis.lessons,
  });

  if (analysis.aiSummary) {
    await journalRepository.update(entry.id, { aiSummary: analysis.aiSummary }, user.id);
  }

  await auditLog({
    userId: user.id,
    action: "journal.create_from_chat",
    resource: "journal",
    resourceId: entry.id,
    ipAddress: getClientIp(request),
    metadata: { tokens },
  });

  return success(entry, "Journal entry created from AI chat.", 201);
});
