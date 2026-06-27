import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody } from "@/lib/api/helpers";
import { aiConversationCreateSchema } from "@/lib/validations";
import { aiConversationRepository } from "@/server/repositories/ai-conversation.repository";

export const GET = withAuth(async (_request, { user }) => {
  const conversations = await aiConversationRepository.listForUser(user.id);
  return success(conversations);
}, "ai.use");

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, aiConversationCreateSchema);
  if (!parsed.ok) return parsed.response;

  const conversation = await aiConversationRepository.create(user.id, {
    persona: parsed.data.persona ?? "business_advisor",
    contextKey: parsed.data.contextKey,
    title: parsed.data.title,
  });

  return success(conversation, "Conversation created.", 201);
}, "ai.use");
