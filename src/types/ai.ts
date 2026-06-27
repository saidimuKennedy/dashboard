export type AiChatMessage = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
};

export type AiConversationSummary = {
  id: string;
  title: string | null;
  persona: string;
  contextKey: string | null;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  preview: string | null;
};

export type AiConversationDetail = AiConversationSummary & {
  messages: AiChatMessage[];
};
