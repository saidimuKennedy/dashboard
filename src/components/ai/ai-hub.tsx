"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ArrowUpRight, MessageSquare, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AiConversationView } from "@/components/ai/ai-conversation-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getContextLabel, getPersonaLabel } from "@/lib/ai/context-labels";
import { cn } from "@/lib/utils";
import type { AiConversationDetail, AiConversationSummary } from "@/types/ai";

export function AiHub() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [conversations, setConversations] = useState<AiConversationSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<AiConversationDetail | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchList = useCallback(() => {
    setLoadingList(true);
    fetch("/api/v1/ai/conversations")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setConversations(json.data);
        else toast.error(json.message ?? "Failed to load conversations.");
      })
      .catch(() => toast.error("Failed to load conversations."))
      .finally(() => setLoadingList(false));
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    const fromUrl = searchParams.get("conversation");
    if (fromUrl) setSelectedId(fromUrl);
  }, [searchParams]);

  useEffect(() => {
    if (!selectedId) {
      setSelected(null);
      return;
    }

    setLoadingDetail(true);
    fetch(`/api/v1/ai/conversations/${selectedId}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setSelected(json.data);
        else toast.error(json.message ?? "Failed to load conversation.");
      })
      .catch(() => toast.error("Failed to load conversation."))
      .finally(() => setLoadingDetail(false));
  }, [selectedId]);

  const grouped = useMemo(() => {
    const groups = new Map<string, AiConversationSummary[]>();
    for (const conversation of conversations) {
      const key = conversation.contextKey ?? "/general";
      const list = groups.get(key) ?? [];
      list.push(conversation);
      groups.set(key, list);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [conversations]);

  function resumeConversation(conversation: AiConversationSummary | AiConversationDetail) {
    const target = conversation.contextKey ?? "/dashboard";
    router.push(`${target}?conversation=${conversation.id}`);
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">AI Hub</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse sidebar chats from every page and jump back to continue them.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchList}>
          Refresh
        </Button>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="flex min-h-0 flex-col">
          <CardHeader className="border-b border-border py-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <MessageSquare className="h-4 w-4 text-primary" />
              Conversation history
            </CardTitle>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-y-auto p-0">
            {loadingList ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 w-full" />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No saved chats yet. Start a conversation from any page using the sidebar AI
                panel.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {grouped.map(([contextKey, items]) => (
                  <section key={contextKey}>
                    <div className="sticky top-0 bg-card/95 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur">
                      {getContextLabel(contextKey === "/general" ? null : contextKey)}
                    </div>
                    {items.map((conversation) => (
                      <button
                        key={conversation.id}
                        type="button"
                        onClick={() => setSelectedId(conversation.id)}
                        className={cn(
                          "w-full border-l-2 px-4 py-3 text-left transition-colors hover:bg-muted/40",
                          selectedId === conversation.id
                            ? "border-l-primary bg-primary/5"
                            : "border-l-transparent"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="line-clamp-1 text-sm font-medium">
                            {conversation.title ?? "Untitled chat"}
                          </p>
                          <span className="shrink-0 text-[10px] text-muted-foreground">
                            {formatDistanceToNow(new Date(conversation.updatedAt), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {conversation.preview ?? "No messages yet"}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px]">
                            {conversation.messageCount} msgs
                          </Badge>
                          <Badge variant="secondary" className="text-[10px]">
                            {getPersonaLabel(conversation.persona)}
                          </Badge>
                        </div>
                      </button>
                    ))}
                  </section>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="flex min-h-0 flex-col">
          {!selectedId ? (
            <CardContent className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
              <Sparkles className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm font-medium">Select a conversation</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Pick a chat from the list to read it in full width, then resume it on the
                  original page.
                </p>
              </div>
            </CardContent>
          ) : loadingDetail || !selected ? (
            <CardContent className="space-y-4 p-6">
              <Skeleton className="h-6 w-64" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-40 w-full" />
            </CardContent>
          ) : (
            <>
              <CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-border py-4">
                <div className="min-w-0">
                  <CardTitle className="truncate text-base">
                    {selected.title ?? "Untitled chat"}
                  </CardTitle>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">
                      {getContextLabel(selected.contextKey)}
                    </Badge>
                    <Badge variant="secondary">{getPersonaLabel(selected.persona)}</Badge>
                    <span className="text-xs text-muted-foreground">
                      Updated{" "}
                      {formatDistanceToNow(new Date(selected.updatedAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>
                <Button size="sm" onClick={() => resumeConversation(selected)}>
                  Resume on {getContextLabel(selected.contextKey)}
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Button>
              </CardHeader>
              <CardContent className="min-h-0 flex-1 overflow-y-auto p-6">
                <AiConversationView messages={selected.messages} />
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
