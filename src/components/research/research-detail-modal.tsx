"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  FlaskConical,
  GripHorizontal,
  Lightbulb,
  Sparkles,
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
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  formatChatTranscript,
  getNextResearchStage,
  parseResearchAiAnalysis,
  parseSourceChat,
  RESEARCH_STAGE_LABELS,
  RESEARCH_STAGE_OPTIONS,
  type ResearchAiAnalysis,
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

const KPI_EXPANDED_DEFAULT = 168;
const KPI_EXPANDED_MIN = 96;
const KPI_EXPANDED_MAX = 320;
const KPI_COLLAPSE_THRESHOLD = 72;

export function ResearchDetailModal({ researchId, onClose }: ResearchDetailModalProps) {
  const [topic, setTopic] = useState<ResearchTopicDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [view, setView] = useState<"details" | "analysis" | "chat">("details");
  const [kpiCollapsed, setKpiCollapsed] = useState(false);
  const [kpiHeight, setKpiHeight] = useState(KPI_EXPANDED_DEFAULT);
  const [draft, setDraft] = useState({
    title: "",
    description: "",
    notes: "",
    stage: "IDEA",
  });
  const bodyRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const fetchTopic = useCallback(() => {
    if (!researchId) return;
    setLoading(true);
    fetch(`/api/v1/research/${researchId}`)
      .then((res) => res.json())
      .then((json) => {
        if (!json.success) {
          toast.error(json.message ?? "Failed to load research item.");
          return;
        }
        const data = json.data as ResearchTopicDetail;
        setTopic(data);
        setDraft({
          title: data.title,
          description: data.description ?? "",
          notes: data.notes ?? "",
          stage: data.stage,
        });
      })
      .catch(() => toast.error("Failed to load research item."))
      .finally(() => setLoading(false));
  }, [researchId]);

  useEffect(() => {
    if (!researchId) {
      setTopic(null);
      return;
    }

    setView("details");
    setKpiCollapsed(false);
    setKpiHeight(KPI_EXPANDED_DEFAULT);
    fetchTopic();
  }, [researchId, fetchTopic]);

  const toggleKpiCollapsed = useCallback(() => {
    setKpiCollapsed((current) => !current);
  }, []);

  const handleResizeStart = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
  }, []);

  const handleResizeMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current || !bodyRef.current) return;

    const bodyTop = bodyRef.current.getBoundingClientRect().top;
    const nextHeight = event.clientY - bodyTop;

    if (nextHeight <= KPI_COLLAPSE_THRESHOLD) {
      setKpiCollapsed(true);
      return;
    }

    setKpiCollapsed(false);
    setKpiHeight(Math.min(KPI_EXPANDED_MAX, Math.max(KPI_EXPANDED_MIN, nextHeight)));
  }, []);

  const handleResizeEnd = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  if (!researchId) return null;

  const analysis = parseResearchAiAnalysis(topic?.aiAnalysis);
  const sourceChat = parseSourceChat(topic?.sourceChat);
  const nextStage = topic ? getNextResearchStage(topic.stage) : null;
  const isArchived = topic?.stage === "ARCHIVED";

  async function saveTopic() {
    if (!researchId) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/v1/research/${researchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title.trim(),
          description: draft.description.trim() || null,
          notes: draft.notes.trim() || null,
          stage: draft.stage,
        }),
      });
      const json = await response.json();
      if (!json.success) {
        toast.error(json.message ?? "Failed to save research topic.");
        return;
      }
      toast.success("Research topic saved.");
      fetchTopic();
      window.dispatchEvent(new CustomEvent("research:updated"));
    } catch {
      toast.error("Failed to save research topic.");
    } finally {
      setSaving(false);
    }
  }

  async function runPipelineAction(
    action: "advance" | "validate" | "archive",
    endpoint?: string,
    patch?: { stage: string }
  ) {
    if (!researchId) return;
    setActionLoading(action);
    try {
      if (patch) {
        const response = await fetch(`/api/v1/research/${researchId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        const json = await response.json();
        if (!json.success) {
          toast.error(json.message ?? "Failed to update stage.");
          return;
        }
        toast.success(`Moved to ${RESEARCH_STAGE_LABELS[patch.stage] ?? patch.stage}.`);
      } else if (endpoint) {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: researchId }),
        });
        const json = await response.json();
        if (!json.success) {
          toast.error(json.message ?? "Action failed.");
          return;
        }
        toast.success(json.message ?? "Updated.");
      }
      fetchTopic();
      window.dispatchEvent(new CustomEvent("research:updated"));
    } catch {
      toast.error("Action failed.");
    } finally {
      setActionLoading(null);
    }
  }

  async function summarizeTopic() {
    if (!researchId) return;
    setActionLoading("summarize");
    try {
      const response = await fetch("/api/v1/research/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: researchId }),
      });
      const json = await response.json();
      if (!json.success) {
        toast.error(json.message ?? "Summarize failed.");
        return;
      }
      const summary = json.data?.response ?? json.data?.summary ?? "";
      if (summary) {
        setDraft((current) => ({
          ...current,
          notes: current.notes ? `${current.notes}\n\n${summary}` : summary,
        }));
        toast.success("Summary added to notes — save to keep it.");
      }
    } catch {
      toast.error("Summarize failed.");
    } finally {
      setActionLoading(null);
    }
  }

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
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-6 py-4">
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
                {analysis && !kpiCollapsed ? (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{analysis.summary}</p>
                ) : null}
              </>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!isArchived && nextStage ? (
              <Button
                variant="outline"
                size="sm"
                loading={actionLoading === "advance"}
                disabled={!!actionLoading || saving}
                onClick={() => runPipelineAction("advance", undefined, { stage: nextStage })}
              >
                Advance to {RESEARCH_STAGE_LABELS[nextStage]}
              </Button>
            ) : null}
            {!isArchived && topic?.stage !== "VALIDATED" && topic?.stage !== "IMPLEMENTED" ? (
              <Button
                variant="outline"
                size="sm"
                loading={actionLoading === "validate"}
                disabled={!!actionLoading || saving}
                onClick={() => runPipelineAction("validate", "/api/v1/research/complete")}
              >
                Mark validated
              </Button>
            ) : null}
            {!isArchived ? (
              <Button
                variant="outline"
                size="sm"
                loading={actionLoading === "archive"}
                disabled={!!actionLoading || saving}
                onClick={() => runPipelineAction("archive", "/api/v1/research/archive")}
              >
                Archive
              </Button>
            ) : null}
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
          <div ref={bodyRef} className="flex min-h-0 flex-1 flex-col">
            {analysis ? (
              <>
                <div
                  className={cn(
                    "shrink-0 overflow-hidden border-b border-border transition-[height] duration-200 ease-out",
                    kpiCollapsed ? "h-auto" : ""
                  )}
                  style={kpiCollapsed ? undefined : { height: kpiHeight }}
                >
                  {kpiCollapsed ? (
                    <CollapsedKpiBar analysis={analysis} onExpand={toggleKpiCollapsed} />
                  ) : (
                    <div className="grid h-full gap-3 overflow-y-auto px-6 py-3 sm:grid-cols-3">
                      <KpiCard
                        title="Importance"
                        value={`${analysis.importanceScore}/100`}
                        badge={
                          <Badge
                            className={cn("capitalize", verdictStyles[analysis.importanceVerdict])}
                          >
                            {analysis.importanceVerdict}
                          </Badge>
                        }
                      />
                      <KpiCard
                        title="Time to execute"
                        icon={Clock}
                        value={analysis.timeToExecute}
                      />
                      <KpiCard
                        title="AI verdict"
                        icon={Target}
                        value={analysis.importanceRationale}
                        compact
                      />
                    </div>
                  )}
                </div>

                <div
                  role="separator"
                  aria-orientation="horizontal"
                  aria-label="Resize KPI panel"
                  className="group flex shrink-0 cursor-row-resize items-center justify-center border-b border-border bg-muted/20 py-1 transition-colors hover:bg-muted/50"
                  onPointerDown={handleResizeStart}
                  onPointerMove={handleResizeMove}
                  onPointerUp={handleResizeEnd}
                  onPointerCancel={handleResizeEnd}
                  onDoubleClick={toggleKpiCollapsed}
                >
                  <div className="flex items-center gap-2 rounded-md px-2 py-0.5 text-muted-foreground group-hover:text-foreground">
                    <GripHorizontal className="h-4 w-4" />
                    <span className="text-[10px] font-medium uppercase tracking-wide">
                      {kpiCollapsed ? "Drag down to expand KPIs" : "Drag to resize KPIs"}
                    </span>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleKpiCollapsed();
                      }}
                      className="rounded p-0.5 hover:bg-muted"
                      aria-label={kpiCollapsed ? "Expand KPIs" : "Collapse KPIs"}
                    >
                      {kpiCollapsed ? (
                        <ChevronDown className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronUp className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </>
            ) : null}

            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex shrink-0 gap-2 border-b border-border px-6">
                <button
                  type="button"
                  className={cn(
                    "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                    view === "details"
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setView("details")}
                >
                  Details
                </button>
                {analysis ? (
                  <button
                    type="button"
                    className={cn(
                      "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                      view === "analysis"
                        ? "border-primary text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setView("analysis")}
                  >
                    AI analysis
                  </button>
                ) : null}
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

              <div className="min-h-0 flex-1 overflow-y-auto p-6">
                {view === "details" ? (
                  <div className="space-y-4">
                    <Field label="Title">
                      <Input
                        value={draft.title}
                        onChange={(e) => setDraft((c) => ({ ...c, title: e.target.value }))}
                        disabled={isArchived}
                      />
                    </Field>
                    <Field label="Description">
                      <Textarea
                        rows={3}
                        value={draft.description}
                        onChange={(e) => setDraft((c) => ({ ...c, description: e.target.value }))}
                        placeholder="What are you exploring?"
                        disabled={isArchived}
                      />
                    </Field>
                    <Field label="Notes">
                      <Textarea
                        rows={5}
                        value={draft.notes}
                        onChange={(e) => setDraft((c) => ({ ...c, notes: e.target.value }))}
                        placeholder="Findings, links, observations…"
                        disabled={isArchived}
                      />
                    </Field>
                    <Field label="Stage">
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={draft.stage}
                        onChange={(e) => setDraft((c) => ({ ...c, stage: e.target.value }))}
                        disabled={isArchived}
                      >
                        {RESEARCH_STAGE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={saveTopic} loading={saving} disabled={isArchived}>
                        Save changes
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={summarizeTopic}
                        loading={actionLoading === "summarize"}
                        disabled={!!actionLoading || saving || isArchived}
                      >
                        <Sparkles className="mr-1 h-3.5 w-3.5" />
                        AI summarize
                      </Button>
                    </div>
                  </div>
                ) : view === "analysis" ? (
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
                        No AI analysis for this topic yet. Use the Details tab to edit, or export a
                        research chat from the AI panel.
                      </p>
                    )}
                  </div>
                ) : view === "chat" ? (
                  sourceChat?.length ? (
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
                )
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CollapsedKpiBar({
  analysis,
  onExpand,
}: {
  analysis: ResearchAiAnalysis;
  onExpand: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onExpand}
      className="flex w-full items-center gap-3 px-6 py-2.5 text-left transition-colors hover:bg-muted/30"
    >
      <span className="shrink-0 text-sm font-semibold tabular-nums">
        {analysis.importanceScore}/100
      </span>
      <Badge className={cn("shrink-0 capitalize", verdictStyles[analysis.importanceVerdict])}>
        {analysis.importanceVerdict}
      </Badge>
      <span className="hidden shrink-0 items-center gap-1 text-xs text-muted-foreground sm:flex">
        <Clock className="h-3 w-3" />
        {analysis.timeToExecute}
      </span>
      <span className="min-w-0 truncate text-xs text-muted-foreground">
        {analysis.importanceRationale}
      </span>
      <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

function KpiCard({
  title,
  value,
  icon: Icon,
  badge,
  compact = false,
}: {
  title: string;
  value: string;
  icon?: typeof Clock;
  badge?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <Card className="min-h-0">
      <CardHeader className="pb-1 pt-3">
        <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-3">
        {compact ? (
          <p className="line-clamp-4 text-sm leading-relaxed text-muted-foreground">{value}</p>
        ) : (
          <>
            <p className="text-xl font-semibold tabular-nums">{value}</p>
            {badge}
          </>
        )}
      </CardContent>
    </Card>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
