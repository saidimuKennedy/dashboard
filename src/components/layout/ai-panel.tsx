"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Copy,
  FlaskConical,
  Send,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useMessageHistory } from "@/hooks/use-message-history";
import { AiMessageContent } from "@/components/ai/ai-message-content";
import { cn } from "@/lib/utils";
import { formatChatTranscript, type ResearchChatMessage } from "@/types/research";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const DEFAULT_WELCOME =
  "Ask me about your business — revenue, risks, compliance, or recent meetings.";

const JOURNAL_WELCOME =
  "Tell me about your day — wins, challenges, lessons, and how you're feeling. I can turn this into a journal entry.";

function getWelcomeMessage(pathname: string) {
  return pathname.startsWith("/journal") ? JOURNAL_WELCOME : DEFAULT_WELCOME;
}

function getExportableMessages(messages: Message[], welcomeMessage: string): ResearchChatMessage[] {
  return messages.filter(
    (message) => !(message.role === "assistant" && message.content === welcomeMessage)
  );
}

export function AiPanel() {
  const router = useRouter();
  const pathname = usePathname();
  const welcomeMessage = getWelcomeMessage(pathname);
  const isJournalPage = pathname.startsWith("/journal");
  const persona = isJournalPage ? "journal_assistant" : "business_advisor";

  const [open, setOpen] = useState(true);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: welcomeMessage },
  ]);
  const [loading, setLoading] = useState(false);
  const [exportingResearch, setExportingResearch] = useState(false);
  const [exportingJournal, setExportingJournal] = useState(false);
  const { pushMessage, onInputChange, handleHistoryKeyDown } = useMessageHistory();

  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].role === "assistant") {
        return [{ role: "assistant", content: welcomeMessage }];
      }
      return prev;
    });
  }, [welcomeMessage]);

  const exportableMessages = getExportableMessages(messages, welcomeMessage);
  const canExport =
    exportableMessages.some((message) => message.role === "user") &&
    exportableMessages.some((message) => message.role === "assistant");

  async function handleSend() {
    if (!input.trim() || loading) return;
    const userMessage = input.trim();
    pushMessage(userMessage);
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch("/api/v1/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ prompt: userMessage, persona }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: json.message ?? "AI request failed. Please try again." },
        ]);
        return;
      }
      const reply =
        json.data?.response ??
        json.data?.reply ??
        "No response received from AI.";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Unable to reach AI service. Try again later." },
      ]);
    } finally {
      setLoading(false);
    }
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

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "absolute top-1/2 z-20 flex h-8 w-5 -translate-y-1/2 items-center justify-center rounded-l-md border border-r-0 border-border bg-card text-muted-foreground transition-colors hover:text-foreground",
          open ? "right-[360px]" : "right-0"
        )}
        aria-label={open ? "Collapse AI panel" : "Expand AI panel"}
      >
        {open ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>

      <aside
        className={cn(
          "flex shrink-0 flex-col border-l border-border bg-card transition-all duration-250 ease-out",
          open ? "w-[360px]" : "w-0 overflow-hidden border-l-0"
        )}
      >
        <div className="flex h-14 items-center justify-between gap-2 border-b border-border px-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-semibold">AI Assistant</p>
              <p className="text-[10px] text-muted-foreground">
                {isJournalPage ? "Journal coach" : "Context-aware insights"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
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
              onClick={exportToResearch}
              disabled={!canExport || exportingResearch}
              title="Export as research item"
            >
              <FlaskConical className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "group relative rounded-lg px-3 py-2 text-sm",
                msg.role === "user"
                  ? "ml-6 bg-primary/15 text-foreground"
                  : "mr-4 bg-muted text-muted-foreground"
              )}
            >
              <AiMessageContent content={msg.content} role={msg.role} />
              {msg.content !== welcomeMessage ? (
                <button
                  type="button"
                  onClick={() => copyMessage(msg.content)}
                  className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-background/60 hover:text-foreground group-hover:opacity-100"
                  title="Copy message"
                >
                  <Copy className="h-3 w-3" />
                </button>
              ) : null}
            </div>
          ))}
          {loading && (
            <div className="mr-4 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
              Thinking…
            </div>
          )}
        </div>

        <div className="space-y-2 border-t border-border p-3">
          {canExport ? (
            <div className="grid gap-2">
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
              {!isJournalPage ? (
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
              onChange={(e) => onInputChange(e.target.value, setInput)}
              onKeyDown={(e) => {
                handleHistoryKeyDown(e, input, setInput);
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={isJournalPage ? "Reflect on your day…" : "Ask JIP anything…"}
              rows={2}
              className="min-h-0 resize-none text-sm"
            />
            <Button size="icon" onClick={handleSend} disabled={loading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
