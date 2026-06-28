"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Copy,
  FlaskConical,
  Gavel,
  MessageSquarePlus,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { useDashboardLayout } from "@/components/layout/dashboard-layout-context";
import { toast } from "sonner";
import { AiConversationView } from "@/components/ai/ai-conversation-view";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAiChat } from "@/hooks/use-ai-chat";
import { useMessageHistory } from "@/hooks/use-message-history";
import { cn } from "@/lib/utils";
import { formatChatTranscript, type ResearchChatMessage } from "@/types/research";

const DEFAULT_WELCOME =
  "Ask me about your business — revenue, risks, compliance, or recent meetings.";

const MEETINGS_WELCOME =
  "Ask about meeting outcomes, upcoming schedules, follow-ups, or whether a meeting achieved its goals.";

const JOURNAL_WELCOME =
  "Tell me about your day — wins, challenges, lessons, and how you're feeling. I can turn this into a journal entry.";

const DECISIONS_WELCOME =
  "Talk through a decision — context, alternatives, tradeoffs, and when to revisit. I can log it as a structured decision record.";

function getWelcomeMessage(pathname: string) {
  if (pathname.startsWith("/journal")) return JOURNAL_WELCOME;
  if (pathname.startsWith("/decisions")) return DECISIONS_WELCOME;
  if (pathname.startsWith("/meetings")) return MEETINGS_WELCOME;
  if (pathname.startsWith("/revenue")) {
    return "Ask about MRR, runway, forecast risks, or revenue trends. Customer names are masked.";
  }
  return DEFAULT_WELCOME;
}

function getPersona(pathname: string) {
  if (pathname.startsWith("/journal")) return "journal_assistant";
  if (pathname.startsWith("/decisions")) return "decision_assistant";
  if (pathname.startsWith("/meetings")) return "meeting_assistant";
  if (pathname.startsWith("/revenue")) return "revenue_advisor";
  return "business_advisor";
}

function getExportableMessages(
  messages: Array<{ role: string; content: string }>,
  welcomeMessage: string
): ResearchChatMessage[] {
  return messages.filter(
    (message) => !(message.role === "assistant" && message.content === welcomeMessage)
  ) as ResearchChatMessage[];
}

function AiPanelInner() {
  const router = useRouter();
  const pathname = usePathname();
  const welcomeMessage = getWelcomeMessage(pathname);
  const isJournalPage = pathname.startsWith("/journal");
  const isDecisionsPage = pathname.startsWith("/decisions");
  const isRevenuePage = pathname.startsWith("/revenue");
  const persona = getPersona(pathname);
  const contextKey = pathname;

  const { isDesktop, aiPanelOpen, setAiPanelOpen, toggleAiPanel } = useDashboardLayout();
  const [input, setInput] = useState("");
  const [exportingResearch, setExportingResearch] = useState(false);
  const [exportingJournal, setExportingJournal] = useState(false);
  const [exportingDecision, setExportingDecision] = useState(false);
  const { pushMessage, onInputChange, handleHistoryKeyDown } = useMessageHistory();

  const { messages, loading, hydrating, sendMessage, startNewChat } = useAiChat({
    contextKey,
    persona,
    welcomeMessage,
  });

  useEffect(() => {
    function handleRefresh() {
      fetch("/api/v1/ai/conversations").catch(() => {});
    }
    window.addEventListener("focus", handleRefresh);
    return () => window.removeEventListener("focus", handleRefresh);
  }, []);

  const exportableMessages = getExportableMessages(messages, welcomeMessage);
  const canExport =
    exportableMessages.some((message) => message.role === "user") &&
    exportableMessages.some((message) => message.role === "assistant");

  async function handleSend() {
    if (!input.trim() || loading) return;
    const userMessage = input.trim();
    pushMessage(userMessage);
    setInput("");
    await sendMessage(userMessage);
  }

  async function copyMessage(content: string) {
    await navigator.clipboard.writeText(content);
    toast.success("Message copied");
  }

  async function copyChat() {
    if (!exportableMessages.length) {
      toast.error("Nothing to copy yet");
      return;
    }
    await navigator.clipboard.writeText(formatChatTranscript(exportableMessages));
    toast.success("Chat copied to clipboard");
  }

  async function exportToResearch() {
    if (!canExport) {
      toast.error("Start a conversation with the AI before exporting.");
      return;
    }

    setExportingResearch(true);
    try {
      const response = await fetch("/api/v1/research/from-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: exportableMessages }),
      });
      const json = await response.json();
      if (!json.success) {
        toast.error(json.message ?? "Failed to export research item.");
        return;
      }

      window.dispatchEvent(new CustomEvent("research:updated"));
      toast.success("Exported to Research", {
        description: json.data?.title ?? "Research item created from this chat.",
        action: {
          label: "View",
          onClick: () => router.push(`/research?open=${json.data.id}`),
        },
      });
    } catch {
      toast.error("Failed to export research item.");
    } finally {
      setExportingResearch(false);
    }
  }

  async function exportToJournal() {
    if (!canExport) {
      toast.error("Chat with the AI about your day before exporting.");
      return;
    }

    setExportingJournal(true);
    try {
      const response = await fetch("/api/v1/journal/from-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: exportableMessages }),
      });
      const json = await response.json();
      if (!json.success) {
        toast.error(json.message ?? "Failed to export journal entry.");
        return;
      }

      window.dispatchEvent(new CustomEvent("journal:updated"));
      toast.success("Saved to Journal", {
        description: "Your reflection was structured into a journal entry.",
        action: {
          label: "View",
          onClick: () => router.push("/journal"),
        },
      });
    } catch {
      toast.error("Failed to export journal entry.");
    } finally {
      setExportingJournal(false);
    }
  }

  async function exportToDecision() {
    if (!canExport) {
      toast.error("Talk through a decision with the AI before exporting.");
      return;
    }

    setExportingDecision(true);
    try {
      const response = await fetch("/api/v1/decisions/from-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: exportableMessages }),
      });
      const json = await response.json();
      if (!json.success) {
        toast.error(json.message ?? "Failed to log decision.");
        return;
      }

      window.dispatchEvent(new CustomEvent("decision:updated"));
      toast.success("Logged to Decisions", {
        description: json.data?.title ?? "Decision created from this chat.",
        action: {
          label: "View",
          onClick: () => router.push(`/decisions?open=${json.data.id}`),
        },
      });
    } catch {
      toast.error("Failed to log decision.");
    } finally {
      setExportingDecision(false);
    }
  }

  async function handleNewChat() {
    await startNewChat();
    toast.success("New chat started");
  }

  const panelContent = (
    <>
      <div className="flex h-14 items-center justify-between gap-2 border-b border-border px-4">
        <div className="flex min-w-0 items-center gap-2">
          <Sparkles className="h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="text-sm font-semibold">AI Assistant</p>
            <p className="truncate text-[10px] text-muted-foreground">
                {isJournalPage
                  ? "Journal coach"
                  : isDecisionsPage
                    ? "Decision coach"
                    : isRevenuePage
                      ? "Revenue advisor"
                      : "Context-aware insights"}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {!isDesktop ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setAiPanelOpen(false)}
                aria-label="Close AI assistant"
              >
                <X className="h-4 w-4" />
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleNewChat}
              title="New chat"
            >
              <MessageSquarePlus className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={copyChat}
              disabled={!exportableMessages.length}
              title="Copy chat"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={exportToJournal}
              disabled={!canExport || exportingJournal}
              title="Save as journal entry"
            >
              <BookOpen className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={exportToDecision}
              disabled={!canExport || exportingDecision}
              title="Log as decision"
            >
              <Gavel className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={exportToResearch}
              disabled={!canExport || exportingResearch}
              title="Export as research item"
            >
              <FlaskConical className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {hydrating ? (
            <div className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
              Loading conversation…
            </div>
          ) : (
            <AiConversationView
              messages={messages}
              loading={loading}
              compact
              welcomeMessage={welcomeMessage}
              onCopyMessage={copyMessage}
            />
          )}
        </div>

        <div className="space-y-2 border-t border-border p-3">
          {canExport ? (
            <div className="grid gap-2">
              {isDecisionsPage ? (
                <Button
                  variant="default"
                  size="sm"
                  className="w-full"
                  onClick={exportToDecision}
                  loading={exportingDecision}
                >
                  <Gavel className="h-3.5 w-3.5" />
                  Log as decision
                </Button>
              ) : null}
              <Button
                variant={isJournalPage ? "default" : "outline"}
                size="sm"
                className="w-full"
                onClick={exportToJournal}
                loading={exportingJournal}
              >
                <BookOpen className="h-3.5 w-3.5" />
                Save as journal entry
              </Button>
              {!isJournalPage && !isDecisionsPage ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={exportToResearch}
                  loading={exportingResearch}
                >
                  <FlaskConical className="h-3.5 w-3.5" />
                  Export as research item
                </Button>
              ) : null}
            </div>
          ) : null}
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(event) => onInputChange(event.target.value, setInput)}
              onKeyDown={(event) => {
                handleHistoryKeyDown(event, input, setInput);
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSend();
                }
              }}
              placeholder={isJournalPage ? "Reflect on your day…" : isDecisionsPage ? "Talk through a decision…" : "Ask JIP anything…"}
              rows={2}
              className="min-h-0 resize-none text-sm"
            />
            <Button size="icon" onClick={handleSend} disabled={loading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
    </>
  );

  if (!isDesktop) {
    if (!aiPanelOpen) return null;

    return (
      <>
        <button
          type="button"
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setAiPanelOpen(false)}
          aria-label="Close AI assistant"
        />
        <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-card shadow-2xl lg:hidden">
          {panelContent}
        </aside>
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={toggleAiPanel}
        className={cn(
          "absolute top-1/2 z-20 hidden h-8 w-5 -translate-y-1/2 items-center justify-center rounded-l-md border border-r-0 border-border bg-card text-muted-foreground transition-colors hover:text-foreground lg:flex",
          aiPanelOpen ? "right-[360px]" : "right-0"
        )}
        aria-label={aiPanelOpen ? "Collapse AI panel" : "Expand AI panel"}
      >
        {aiPanelOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>

      <aside
        className={cn(
          "hidden shrink-0 flex-col border-l border-border bg-card transition-all duration-250 ease-out lg:flex",
          aiPanelOpen ? "w-[360px]" : "w-0 overflow-hidden border-l-0"
        )}
      >
        {panelContent}
      </aside>
    </>
  );
}

export function AiPanel() {
  return (
    <Suspense
      fallback={
        <aside className="flex w-[360px] shrink-0 flex-col border-l border-border bg-card" />
      }
    >
      <AiPanelInner />
    </Suspense>
  );
}
