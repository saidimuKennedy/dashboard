"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function AiPanel() {
  const [open, setOpen] = useState(true);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Ask me about your business — revenue, risks, compliance, or recent meetings.",
    },
  ]);
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    if (!input.trim() || loading) return;
    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch("/api/v1/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });
      const json = await res.json();
      const reply =
        json?.data?.reply ??
        json?.data?.message ??
        "AI assistant is not configured yet. Connect your API key in Settings.";
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
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <Sparkles className="h-4 w-4 text-primary" />
          <div>
            <p className="text-sm font-semibold">AI Assistant</p>
            <p className="text-[10px] text-muted-foreground">Context-aware insights</p>
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "rounded-lg px-3 py-2 text-sm",
                msg.role === "user"
                  ? "ml-6 bg-primary/15 text-foreground"
                  : "mr-4 bg-muted text-muted-foreground"
              )}
            >
              {msg.content}
            </div>
          ))}
          {loading && (
            <div className="mr-4 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
              Thinking…
            </div>
          )}
        </div>

        <div className="border-t border-border p-3">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask JIP anything…"
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
