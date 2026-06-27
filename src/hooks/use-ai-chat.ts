"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { AiChatMessage } from "@/types/ai";

function storageKey(contextKey: string) {
  return `jip:ai:${contextKey}`;
}

export function useAiChat({
  contextKey,
  persona,
  welcomeMessage,
}: {
  contextKey: string;
  persona: string;
  welcomeMessage: string;
}) {
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<AiChatMessage[]>([
    { role: "assistant", content: welcomeMessage },
  ]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hydrating, setHydrating] = useState(true);

  const loadConversation = useCallback(
    async (id: string) => {
      setLoading(true);
      try {
        const response = await fetch(`/api/v1/ai/conversations/${id}`);
        const json = await response.json();
        if (!json.success) return false;

        const loaded = json.data.messages as AiChatMessage[];
        setConversationId(id);
        sessionStorage.setItem(storageKey(contextKey), id);
        setMessages(
          loaded.length > 0
            ? loaded
            : [{ role: "assistant", content: welcomeMessage }]
        );
        return true;
      } catch {
        return false;
      } finally {
        setLoading(false);
      }
    },
    [contextKey, welcomeMessage]
  );

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      setHydrating(true);
      const fromUrl = searchParams.get("conversation");
      const fromStorage =
        typeof window !== "undefined" ? sessionStorage.getItem(storageKey(contextKey)) : null;
      const targetId = fromUrl ?? fromStorage;

      if (targetId) {
        const ok = await loadConversation(targetId);
        if (!cancelled && !ok) {
          setConversationId(null);
          setMessages([{ role: "assistant", content: welcomeMessage }]);
        }
      } else {
        setConversationId(null);
        setMessages([{ role: "assistant", content: welcomeMessage }]);
      }

      if (!cancelled) setHydrating(false);
    }

    hydrate();
    return () => {
      cancelled = true;
    };
  }, [contextKey, welcomeMessage, searchParams, loadConversation]);

  const startNewChat = useCallback(async () => {
    const response = await fetch("/api/v1/ai/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ persona, contextKey }),
    });
    const json = await response.json();
    const id = json.success ? (json.data.id as string) : null;
    setConversationId(id);
    if (id) sessionStorage.setItem(storageKey(contextKey), id);
    setMessages([{ role: "assistant", content: welcomeMessage }]);
    return id;
  }, [contextKey, persona, welcomeMessage]);

  const sendMessage = useCallback(
    async (prompt: string) => {
      if (!prompt.trim() || loading) return null;

      setMessages((prev) => [...prev, { role: "user", content: prompt.trim() }]);
      setLoading(true);

      try {
        const response = await fetch("/api/v1/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            prompt: prompt.trim(),
            persona,
            contextKey,
            conversationId: conversationId ?? undefined,
          }),
        });
        const json = await response.json();

        if (!response.ok || !json.success) {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: json.message ?? "AI request failed. Please try again." },
          ]);
          return null;
        }

        const reply =
          json.data?.response ??
          json.data?.reply ??
          "No response received from AI.";
        const nextConversationId = json.data?.conversationId as string | undefined;

        if (nextConversationId) {
          setConversationId(nextConversationId);
          sessionStorage.setItem(storageKey(contextKey), nextConversationId);
        }

        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
        return nextConversationId ?? conversationId;
      } catch {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Unable to reach AI service. Try again later." },
        ]);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [contextKey, conversationId, loading, persona]
  );

  return {
    messages,
    conversationId,
    loading,
    hydrating,
    sendMessage,
    startNewChat,
    loadConversation,
  };
}
