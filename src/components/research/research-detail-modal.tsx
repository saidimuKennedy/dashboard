"use client";

import { useEffect, useState } from "react";
import {
  Clock,
  Copy,
  FlaskConical,
  Lightbulb,
  Target,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AiMessageContent } from "@/components/ai/ai-message-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  formatChatTranscript,
  parseResearchAiAnalysis,
  parseSourceChat,
  type ResearchTopicDetail,
} from "@/types/research";

interface ResearchDetailModalProps {
  researchId: string | null;
  onClose: () => void;
}

const verdictStyles = {
  critical: "bg-error/15 text-error border-error/30",
  high: "bg-warning/15 text-warning border-warning/30",
  medium: "bg-primary/15 text-primary border-primary/30",
  low: "bg-muted text-muted-foreground border-border",
};

export function ResearchDetailModal({ researchId, onClose }: ResearchDetailModalProps) {
  const [topic, setTopic] = useState<ResearchTopicDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"overview" | "chat">("overview");

  useEffect(() => {
    if (!researchId) {
      setTopic(null);
      return;
    }

    setLoading(true);
    setView("overview");
    fetch(`/api/v1/research/${researchId}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setTopic(json.data);
        else toast.error(json.message ?? "Failed to load research item.");
      })
      .catch(() => toast.error("Failed to load research item."))
      .finally(() => setLoading(false));
  }, [researchId]);

  if (!researchId) return null;

  const analysis = parseResearchAiAnalysis(topic?.aiAnalysis);
  const sourceChat = parseSourceChat(topic?.sourceChat);

  async function copyChat() {
    const transcript = sourceChat?.length
      ? formatChatTranscript(sourceChat)
      : topic?.notes ?? "";
    if (!transcript) return;
    await navigator.clipboard.writeText(transcript);
    toast.success("Chat copied to clipboard");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close research details"
      />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
          <div className="min-w-0">
            {loading ? (
              <Skeleton className="h-6 w-64" />
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <FlaskConical className="h-4 w-4 text-primary" />
                  <h2 className="truncate text-lg font-semibold">{topic?.title ?? "Research"}</h2>
                  {topic?.stage ? <Badge variant="secondary">{topic.stage}</Badge> : null}
                </div>
                {analysis ? (
                  <p className="mt-1 text-sm text-muted-foreground">{analysis.summary}</p>
                ) : null}
              </>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {sourceChat?.length || topic?.notes ? (
              <Button variant="outline" size="sm" onClick={copyChat}>
                <Copy className="h-3.5 w-3.5" />
                Copy chat
              </Button>
            ) : null}
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4 p-6">
            <div className="grid gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-24 w-full" />
              ))}
            </div>
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <>
            {analysis ? (
              <div className="grid gap-4 border-b border-border px-6 py-4 sm:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground">
                      Importance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-semibold tabular-nums">{analysis.importanceScore}/100</p>
                    <Badge
                      className={cn("mt-2 capitalize", verdictStyles[analysis.importanceVerdict])}
                    >
                      {analysis.importanceVerdict}
                    </Badge>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      Time to execute
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-base font-semibold">{analysis.timeToExecute}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <Target className="h-3.5 w-3.5" />
                      AI verdict
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {analysis.importanceRationale}
                    </p>
                  </CardContent>
                </Card>
              </div>
            ) : null}

            <div className="flex gap-2 border-b border-border px-6">
              <button
                type="button"
                className={cn(
                  "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                  view === "overview"
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setView("overview")}
              >
                Overview
              </button>
              <button
                type="button"
                className={cn(
                  "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                  view === "chat"
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setView("chat")}
              >
                Full chat
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {view === "overview" ? (
                <div className="space-y-6">
                  {analysis ? (
                    <>
                      <Section
                        icon={Target}
                        title="Executive summary"
                        items={[analysis.summary]}
                        paragraph
                      />
                      <Section icon={Lightbulb} title="Ideas to execute" items={analysis.executionIdeas} />
                      <Section
                        icon={Users}
                        title="Delegate or assign"
                        items={analysis.delegationIdeas}
                      />
                      <Section icon={Users} title="Teams needed" items={analysis.teamsNeeded} />
                      <Section icon={Wallet} title="Resources needed" items={analysis.resourcesNeeded} />
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {topic?.description ?? topic?.summary ?? "No AI analysis available for this item."}
                    </p>
                  )}
                </div>
              ) : sourceChat?.length ? (
                <div className="space-y-3">
                  {sourceChat.map((message, index) => (
                    <div
                      key={index}
                      className={cn(
                        "rounded-lg px-3 py-2 text-sm",
                        message.role === "user"
                          ? "ml-8 bg-primary/15 text-foreground"
                          : "mr-8 bg-muted text-muted-foreground"
                      )}
                    >
                      <AiMessageContent content={message.content} role={message.role} />
                    </div>
                  ))}
                </div>
              ) : topic?.notes ? (
                <div className="prose-ai whitespace-pre-wrap text-sm text-muted-foreground">
                  {topic.notes}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No chat transcript saved for this item.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  items,
  paragraph = false,
}: {
  icon: typeof Target;
  title: string;
  items: string[];
  paragraph?: boolean;
}) {
  if (!items.length) return null;

  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {paragraph ? (
        <p className="text-sm leading-relaxed text-muted-foreground">{items[0]}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item, index) => (
            <li
              key={index}
              className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground"
            >
              {item}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
