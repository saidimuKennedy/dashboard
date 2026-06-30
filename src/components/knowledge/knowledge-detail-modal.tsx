"use client";

import { useCallback, useEffect, useState } from "react";
import { AiMarkdown } from "@/components/ai/ai-message-content";
import { BookOpen, Sparkles, Trash2, X } from "lucide-react";
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
import {
  ARTICLE_STATUS_LABELS,
  ARTICLE_STATUS_OPTIONS,
  type KnowledgeDetail,
  type RelatedKnowledgeItem,
} from "@/types/knowledge";

interface KnowledgeDetailModalProps {
  articleId: string | null;
  onClose: () => void;
  onOpenArticle?: (id: string) => void;
}

export function KnowledgeDetailModal({
  articleId,
  onClose,
  onOpenArticle,
}: KnowledgeDetailModalProps) {
  const [article, setArticle] = useState<KnowledgeDetail | null>(null);
  const [related, setRelated] = useState<RelatedKnowledgeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    title: "",
    summary: "",
    content: "",
    status: "DRAFT" as KnowledgeDetail["status"],
  });

  const fetchArticle = useCallback(() => {
    if (!articleId) return;
    setLoading(true);
    fetch(`/api/v1/knowledge/${articleId}`)
      .then((res) => res.json())
      .then((json) => {
        if (!json.success) {
          toast.error(json.message ?? "Failed to load article.");
          return;
        }
        const data = json.data as KnowledgeDetail;
        setArticle(data);
        setDraft({
          title: data.title,
          summary: data.summary ?? "",
          content: data.content,
          status: data.status,
        });
        setAiSummary(null);
      })
      .catch(() => toast.error("Failed to load article."))
      .finally(() => setLoading(false));
  }, [articleId]);

  const fetchRelated = useCallback(() => {
    if (!articleId) return;
    const params = new URLSearchParams({ id: articleId, limit: "5" });
    if (article?.category?.id) params.set("categoryId", article.category.id);
    fetch(`/api/v1/knowledge/related?${params}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setRelated(json.data?.items ?? []);
        }
      })
      .catch(() => {});
  }, [articleId, article?.category?.id]);

  useEffect(() => {
    if (!articleId) {
      setArticle(null);
      setRelated([]);
      setAiSummary(null);
      return;
    }
    fetchArticle();
  }, [articleId, fetchArticle]);

  useEffect(() => {
    if (article) fetchRelated();
  }, [article, fetchRelated]);

  if (!articleId) return null;

  async function saveArticle() {
    if (!articleId || !draft.title.trim() || !draft.content.trim()) {
      toast.error("Title and content are required.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/v1/knowledge/${articleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title,
          summary: draft.summary || null,
          content: draft.content,
          status: draft.status,
        }),
      });
      const json = await response.json();
      if (!json.success) {
        toast.error(json.message ?? "Failed to save article.");
        return;
      }
      toast.success("Article saved.");
      fetchArticle();
      window.dispatchEvent(new CustomEvent("knowledge:updated"));
    } catch {
      toast.error("Failed to save article.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteArticle() {
    if (!articleId) return;
    if (!window.confirm("Delete this article? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/v1/knowledge/${articleId}`, { method: "DELETE" });
      const json = await response.json();
      if (!json.success) {
        toast.error(json.message ?? "Failed to delete article.");
        return;
      }
      toast.success("Article deleted.");
      window.dispatchEvent(new CustomEvent("knowledge:updated"));
      onClose();
    } catch {
      toast.error("Failed to delete article.");
    } finally {
      setDeleting(false);
    }
  }

  async function generateSummary() {
    if (!articleId) return;
    setSummarizing(true);
    try {
      const response = await fetch("/api/v1/knowledge/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: articleId }),
      });
      const json = await response.json();
      if (!json.success) {
        toast.error(json.message ?? "Failed to generate summary.");
        return;
      }
      setAiSummary(json.data?.response ?? null);
      toast.success("Summary generated.");
    } catch {
      toast.error("Failed to generate summary.");
    } finally {
      setSummarizing(false);
    }
  }

  function applyAiSummary() {
    if (!aiSummary) return;
    setDraft((current) => ({ ...current, summary: aiSummary }));
    setAiSummary(null);
    toast.success("Summary applied to draft.");
  }

  const authorName = article?.author
    ? `${article.author.firstName} ${article.author.lastName}`.trim()
    : null;

  return (
    <DetailModalShell onClose={onClose} closeLabel="Close article" maxWidth="4xl">
      <div className={detailModalHeaderClassName()}>
        <div className="min-w-0 flex-1">
          {loading ? (
            <Skeleton className="h-6 w-64" />
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                <h2 className="truncate text-lg font-semibold">{article?.title ?? "Article"}</h2>
                {article ? (
                  <Badge variant="secondary">{ARTICLE_STATUS_LABELS[article.status]}</Badge>
                ) : null}
                {article?.category ? (
                  <Badge variant="outline">{article.category.name}</Badge>
                ) : null}
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
                {authorName ? <span>{authorName}</span> : null}
                {article?.updatedAt ? (
                  <span>Updated {new Date(article.updatedAt).toLocaleDateString()}</span>
                ) : null}
                {article?.version ? <span>v{article.version}</span> : null}
              </div>
            </>
          )}
        </div>
        <div className={detailModalActionsClassName()}>
          <Button
            variant="outline"
            size="sm"
            onClick={generateSummary}
            loading={summarizing}
            disabled={loading || !article}
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
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : (
          <div className="space-y-4">
            {aiSummary ? (
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-sm font-medium">AI Summary</CardTitle>
                    <Button variant="outline" size="sm" onClick={applyAiSummary}>
                      Use as summary
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <AiMarkdown content={aiSummary} />
                </CardContent>
              </Card>
            ) : null}

            <div className="space-y-2">
              <label htmlFor="knowledge-title" className="text-sm font-medium">
                Title
              </label>
              <Input
                id="knowledge-title"
                value={draft.title}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, title: event.target.value }))
                }
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="knowledge-status" className="text-sm font-medium">
                Status
              </label>
              <select
                id="knowledge-status"
                className="flex h-9 w-full rounded-lg border border-input bg-muted/50 px-3 py-1 text-sm"
                value={draft.status}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    status: event.target.value as KnowledgeDetail["status"],
                  }))
                }
                disabled={saving}
              >
                {ARTICLE_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="knowledge-summary" className="text-sm font-medium">
                Summary
              </label>
              <Textarea
                id="knowledge-summary"
                value={draft.summary}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, summary: event.target.value }))
                }
                rows={3}
                placeholder="Short description for lists and search"
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="knowledge-content" className="text-sm font-medium">
                Content
              </label>
              <Textarea
                id="knowledge-content"
                value={draft.content}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, content: event.target.value }))
                }
                rows={12}
                disabled={saving}
              />
            </div>

            {article?.tags?.length ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {article.tags.map(({ tag }) => (
                    <Badge key={tag.id} variant="secondary">
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}

            {related.length > 0 ? (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Related articles</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {related.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="block w-full rounded-lg border border-border px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50"
                      onClick={() => onOpenArticle?.(item.id)}
                    >
                      <span className="font-medium">{item.title}</span>
                      {item.summary ? (
                        <span className="mt-1 block line-clamp-2 text-muted-foreground">
                          {item.summary}
                        </span>
                      ) : null}
                    </button>
                  ))}
                </CardContent>
              </Card>
            ) : null}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border px-6 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={deleteArticle}
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
          <Button onClick={saveArticle} loading={saving} disabled={loading || deleting}>
            Save
          </Button>
        </div>
      </div>
    </DetailModalShell>
  );
}
