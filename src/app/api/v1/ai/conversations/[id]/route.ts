import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { aiConversationRepository } from "@/server/repositories/ai-conversation.repository";

export const GET = withAuth(async (_request, { user, params }) => {
  const conversation = await aiConversationRepository.getForUser(user.id, params!.id);
  if (!conversation) return notFound("Conversation not found.");
  return success(conversation);
}, "ai.use");
