"use client";

import { Copy } from "lucide-react";
import { AiMessageContent } from "@/components/ai/ai-message-content";
import { cn } from "@/lib/utils";
import type { AiChatMessage } from "@/types/ai";

interface AiConversationViewProps {
  messages: AiChatMessage[];
  loading?: boolean;
  compact?: boolean;
  onCopyMessage?: (content: string) => void;
  welcomeMessage?: string;
}

export function AiConversationView({
  messages,
  loading,
  compact = false,
  onCopyMessage,
  welcomeMessage,
}: AiConversationViewProps) {
  return (
    <div className={cn(compact ? "space-y-3" : "space-y-4")}>
      {messages.map((message, index) => (
        <div
          key={message.id ?? index}
          className={cn(
            "group relative rounded-lg text-sm",
            compact ? "px-3 py-2" : "rounded-xl px-4 py-3 leading-relaxed",
            message.role === "user"
              ? compact
                ? "ml-6 bg-primary/15 text-foreground"
                : "ml-auto max-w-[85%] bg-primary/15 text-foreground"
              : compact
                ? "mr-4 bg-muted text-muted-foreground"
                : "mr-auto max-w-[85%] bg-muted text-muted-foreground"
          )}
        >
          <AiMessageContent content={message.content} role={message.role} />
          {onCopyMessage && message.content !== welcomeMessage ? (
            <button
              type="button"
              onClick={() => onCopyMessage(message.content)}
              className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-background/60 hover:text-foreground group-hover:opacity-100"
              title="Copy message"
            >
              <Copy className="h-3 w-3" />
            </button>
          ) : null}
        </div>
      ))}
      {loading ? (
        <div
          className={cn(
            "rounded-lg bg-muted text-sm text-muted-foreground",
            compact ? "mr-4 px-3 py-2" : "max-w-[85%] rounded-xl px-4 py-3"
          )}
        >
          Thinking…
        </div>
      ) : null}
    </div>
  );
}
