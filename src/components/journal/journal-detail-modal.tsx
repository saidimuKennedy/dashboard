"use client";

import { useCallback, useEffect, useState } from "react";
import { PenLine, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  DetailModalShell,
  detailModalActionsClassName,
  detailModalHeaderClassName,
} from "@/components/ui/detail-modal-shell";
import { AiMarkdown } from "@/components/ai/ai-message-content";
import type { JournalDetail } from "@/types/journal";

interface JournalDetailModalProps {
  entryId: string | null;
  onClose: () => void;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function JournalDetailModal({ entryId, onClose }: JournalDetailModalProps) {
  const [entry, setEntry] = useState<JournalDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [draft, setDraft] = useState({
    content: "",
    mood: "",
    wins: "",
    challenges: "",
    lessons: "",
  });

  const fetchEntry = useCallback(() => {
    if (!entryId) return;
    setLoading(true);
    fetch(`/api/v1/journal/${entryId}`)
      .then((res) => res.json())
      .then((json) => {
        if (!json.success) {
          toast.error(json.message ?? "Failed to load journal entry.");
          return;
        }
        const data = json.data as JournalDetail;
        setEntry(data);
        setDraft({
          content: data.content,
          mood: data.mood ?? "",
          wins: data.wins ?? "",
          challenges: data.challenges ?? "",
          lessons: data.lessons ?? "",
        });
      })
      .catch(() => toast.error("Failed to load journal entry."))
      .finally(() => setLoading(false));
  }, [entryId]);

  useEffect(() => {
    if (!entryId) {
      setEntry(null);
      return;
    }
    fetchEntry();
  }, [entryId, fetchEntry]);

  if (!entryId) return null;

  async function saveEntry() {
    if (!entryId || !draft.content.trim()) {
      toast.error("Entry content is required.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/v1/journal/${entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: draft.content,
          mood: draft.mood || null,
          wins: draft.wins || null,
          challenges: draft.challenges || null,
          lessons: draft.lessons || null,
        }),
      });
      const json = await response.json();
      if (!json.success) {
        toast.error(json.message ?? "Failed to save journal entry.");
        return;
      }
      toast.success("Journal entry saved.");
      fetchEntry();
      window.dispatchEvent(new CustomEvent("journal:updated"));
    } catch {
      toast.error("Failed to save journal entry.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteEntry() {
    if (!entryId) return;
    if (!window.confirm("Delete this journal entry? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/v1/journal/${entryId}`, { method: "DELETE" });
      const json = await response.json();
      if (!json.success) {
        toast.error(json.message ?? "Failed to delete journal entry.");
        return;
      }
      toast.success("Journal entry deleted.");
      window.dispatchEvent(new CustomEvent("journal:updated"));
      onClose();
    } catch {
      toast.error("Failed to delete journal entry.");
    } finally {
      setDeleting(false);
    }
  }

  async function generateSummary() {
    if (!entryId) return;
    setSummarizing(true);
    try {
      const response = await fetch("/api/v1/journal/reflect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: entryId }),
      });
      const json = await response.json();
      if (!json.success) {
        toast.error(json.message ?? "Failed to generate summary.");
        return;
      }
      toast.success("AI summary updated.");
      fetchEntry();
      window.dispatchEvent(new CustomEvent("journal:updated"));
    } catch {
      toast.error("Failed to generate summary.");
    } finally {
      setSummarizing(false);
    }
  }

  const authorName = entry?.author
    ? `${entry.author.firstName} ${entry.author.lastName}`.trim()
    : null;

  return (
    <DetailModalShell onClose={onClose} closeLabel="Close journal entry" maxWidth="2xl">
        <div className={detailModalHeaderClassName()}>
          <div className="min-w-0 flex-1">
            {loading ? (
              <Skeleton className="h-6 w-48" />
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <PenLine className="h-4 w-4 text-primary" />
                  <h2 className="text-lg font-semibold">
                    {entry ? formatDate(entry.date) : "Journal Entry"}
                  </h2>
                  {entry?.mood ? <Badge variant="secondary">{entry.mood}</Badge> : null}
                </div>
                {authorName ? (
                  <p className="mt-1 text-sm text-muted-foreground">{authorName}</p>
                ) : null}
              </>
            )}
          </div>
          <div className={detailModalActionsClassName()}>
            <Button
              variant="outline"
              size="sm"
              onClick={generateSummary}
              loading={summarizing}
              disabled={loading || !entry}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Summarize
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <div className="space-y-4">
              {entry?.aiSummary ? (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">AI Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <AiMarkdown content={entry.aiSummary} />
                  </CardContent>
                </Card>
              ) : null}

              <div className="space-y-2">
                <label htmlFor="journal-content" className="text-sm font-medium">
                  Entry
                </label>
                <Textarea
                  id="journal-content"
                  value={draft.content}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, content: event.target.value }))
                  }
                  rows={8}
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="journal-mood" className="text-sm font-medium">
                  Mood
                </label>
                <Input
                  id="journal-mood"
                  value={draft.mood}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, mood: event.target.value }))
                  }
                  placeholder="e.g. focused, tired, optimistic"
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="journal-wins" className="text-sm font-medium">
                  Wins
                </label>
                <Textarea
                  id="journal-wins"
                  value={draft.wins}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, wins: event.target.value }))
                  }
                  rows={3}
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="journal-challenges" className="text-sm font-medium">
                  Challenges
                </label>
                <Textarea
                  id="journal-challenges"
                  value={draft.challenges}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, challenges: event.target.value }))
                  }
                  rows={3}
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="journal-lessons" className="text-sm font-medium">
                  Lessons
                </label>
                <Textarea
                  id="journal-lessons"
                  value={draft.lessons}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, lessons: event.target.value }))
                  }
                  rows={3}
                  disabled={saving}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border px-6 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={deleteEntry}
            loading={deleting}
            disabled={loading || saving}
            className="text-error hover:text-error"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving || deleting}>
              Cancel
            </Button>
            <Button onClick={saveEntry} loading={saving} disabled={loading || deleting}>
              Save
            </Button>
          </div>
        </div>
    </DetailModalShell>
  );
}
