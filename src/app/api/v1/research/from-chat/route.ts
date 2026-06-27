import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { researchFromChatSchema } from "@/lib/validations";
import { researchRepository } from "@/server/repositories/dashboard.repository";
import { auditLog } from "@/lib/logger/audit";
import { aiService } from "@/server/ai/ai.service";
import { formatChatTranscript } from "@/types/research";
import type { Prisma } from "@prisma/client";

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, researchFromChatSchema);
  if (!parsed.ok) return parsed.response;

  const { messages, title: requestedTitle } = parsed.data;
  const { title, analysis, tokens } = await aiService.analyzeResearchChat(messages);

  const topic = await researchRepository.create({
    title: requestedTitle ?? title,
    description: analysis.summary,
    summary: analysis.summary,
    notes: formatChatTranscript(messages),
    sourceChat: messages as Prisma.InputJsonValue,
    aiAnalysis: analysis as Prisma.InputJsonValue,
    authorId: user.id,
    stage: "RESEARCHING",
  });

  await auditLog({
    userId: user.id,
    action: "research.create_from_chat",
    resource: "research",
    resourceId: topic.id,
    ipAddress: getClientIp(request),
    metadata: { tokens },
  });

  return success(topic, "Research item exported from AI chat.", 201);
}, "knowledge.write");
