"use client";

import { useState } from "react";
import { Send, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function AiPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "I'm your JIP AI assistant. Ask about revenue trends, compliance status, recent meetings, or strategic recommendations.",
    },
  ]);
  const [input, setInput] = useState("");
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

  function clearChat() {
    setMessages([
      {
        role: "assistant",
        content: "Conversation cleared. How can I help?",
      },
    ]);
  }

  return (
    <div className="flex h-full flex-col space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">AI Workspace</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Full AI chat with business context and recommendations.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={clearChat}>
          <Trash2 className="h-4 w-4" />
          Clear
        </Button>
      </div>

      <Card className="flex flex-1 flex-col">
        <CardHeader className="flex flex-row items-center gap-2 border-b border-border py-3">
          <Sparkles className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm">Conversation</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col p-0">
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "ml-auto bg-primary/15 text-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {msg.content}
              </div>
            ))}
            {loading && (
              <div className="max-w-[80%] rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
                Thinking…
              </div>
            )}
          </div>
          <div className="border-t border-border p-4">
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
                placeholder="Ask about your business…"
                rows={3}
                className="resize-none"
              />
              <Button size="icon" className="h-auto" onClick={handleSend} disabled={loading}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
