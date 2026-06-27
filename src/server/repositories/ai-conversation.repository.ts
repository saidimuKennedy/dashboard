import { db } from "@/lib/db";
import type { AiConversationDetail, AiConversationSummary } from "@/types/ai";

function mapSummary(
  conversation: {
    id: string;
    title: string | null;
    persona: string;
    contextKey: string | null;
    createdAt: Date;
    updatedAt: Date;
    messages: Array<{ content: string; role: string; createdAt: Date }>;
    _count: { messages: number };
  }
): AiConversationSummary {
  const lastMessage = conversation.messages[0];
  return {
    id: conversation.id,
    title: conversation.title,
    persona: conversation.persona,
    contextKey: conversation.contextKey,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
    messageCount: conversation._count.messages,
    preview: lastMessage?.content.slice(0, 160) ?? null,
  };
}

export const aiConversationRepository = {
  async listForUser(userId: string, limit = 50): Promise<AiConversationSummary[]> {
    const conversations = await db.aiConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: limit,
      include: {
        _count: { select: { messages: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { content: true, role: true, createdAt: true },
        },
      },
    });

    return conversations
      .filter((conversation) => conversation._count.messages > 0)
      .map(mapSummary);
  },

  async getForUser(userId: string, id: string): Promise<AiConversationDetail | null> {
    const conversation = await db.aiConversation.findFirst({
      where: { id, userId },
      include: {
        _count: { select: { messages: true } },
        messages: {
          orderBy: { createdAt: "asc" },
          select: { id: true, role: true, content: true, createdAt: true },
        },
      },
    });

    if (!conversation) return null;

    return {
      ...mapSummary({
        ...conversation,
        messages: conversation.messages.length
          ? [conversation.messages[conversation.messages.length - 1]]
          : [],
      }),
      messages: conversation.messages.map((message) => ({
        id: message.id,
        role: message.role as "user" | "assistant",
        content: message.content,
        createdAt: message.createdAt.toISOString(),
      })),
    };
  },

  async create(userId: string, data: { persona: string; contextKey?: string; title?: string }) {
    return db.aiConversation.create({
      data: {
        userId,
        persona: data.persona,
        contextKey: data.contextKey,
        title: data.title,
      },
    });
  },

  async touch(id: string) {
    return db.aiConversation.update({
      where: { id },
      data: { updatedAt: new Date() },
    });
  },
};
