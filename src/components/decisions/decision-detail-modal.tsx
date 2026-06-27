"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Gavel, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  DECISION_STATUS_LABELS,
  DECISION_STATUS_OPTIONS,
  formatStatusTransition,
  isReviewDue,
  type DecisionDetail,
  type SimilarDecision,
} from "@/types/decision";
import { getSelectableStatuses } from "@/lib/decisions/status-transitions";
import type { DecisionStatus } from "@prisma/client";

interface DecisionDetailModalProps {
  decisionId: string | null;
  onClose: () => void;
}

const statusStyles: Record<string, string> = {
  PROPOSED: "bg-muted text-muted-foreground border-border",
  APPROVED: "bg-primary/15 text-primary border-primary/30",
  IMPLEMENTED: "bg-success/15 text-success border-success/30",
  REVIEWED: "bg-warning/15 text-warning border-warning/30",
  SUPERSEDED: "bg-error/15 text-error border-error/30",
};

export function DecisionDetailModal({ decisionId, onClose }: DecisionDetailModalProps) {
  const [decision, setDecision] = useState<DecisionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [similar, setSimilar] = useState<SimilarDecision[]>([]);
  const [draft, setDraft] = useState({
    title: "",
    context: "",
    alternatives: "",
    decision: "",
    reasoning: "",
    evidence: "",
    outcome: "",
    status: "APPROVED",
    reviewDate: "",
  });

  const fetchDecision = useCallback(() => {
    if (!decisionId) return;
    setLoading(true);
    fetch(`/api/v1/decisions/${decisionId}`)
      .then((res) => res.json())
      .then((json) => {
        if (!json.success) {
          toast.error(json.message ?? "Failed to load decision.");
          return;
        }
        const data = json.data as DecisionDetail;
        setDecision({ ...data, statusHistory: data.statusHistory ?? [] });
        setDraft({
          title: data.title,
          context: data.context,
          alternatives: data.alternatives ?? "",
          decision: data.decision,
          reasoning: data.reasoning ?? "",
          evidence: data.evidence ?? "",
          outcome: data.outcome ?? "",
          status: data.status,
          reviewDate: data.reviewDate ? data.reviewDate.slice(0, 10) : "",
        });
      })
      .catch(() => toast.error("Failed to load decision."))
      .finally(() => setLoading(false));
  }, [decisionId]);

  const fetchSimilar = useCallback(() => {
    if (!decisionId || !draft.title || !draft.context || !draft.decision) return;
    fetch("/api/v1/decisions/similar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: draft.title,
        context: draft.context,
        decision: draft.decision,
        excludeId: decisionId,
      }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setSimilar(json.data?.items ?? []);
      })
      .catch(() => setSimilar([]));
  }, [decisionId, draft.title, draft.context, draft.decision]);

  useEffect(() => {
    if (!decisionId) {
      setDecision(null);
      setSimilar([]);
      return;
    }
    fetchDecision();
  }, [decisionId, fetchDecision]);

  useEffect(() => {
    if (decisionId && decision) fetchSimilar();
  }, [decisionId, decision, fetchSimilar]);

  if (!decisionId) return null;

  const reviewDue = decision ? isReviewDue(decision.reviewDate, decision.status) : false;
  const selectableStatuses = decision
    ? getSelectableStatuses(decision.status as DecisionStatus).map((value) => ({
        value,
        label: DECISION_STATUS_LABELS[value],
      }))
    : DECISION_STATUS_OPTIONS;

  async function saveDecision() {
    if (!decisionId) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/v1/decisions/${decisionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title,
          context: draft.context,
          alternatives: draft.alternatives || null,
          decision: draft.decision,
          reasoning: draft.reasoning || null,
          evidence: draft.evidence || null,
          outcome: draft.outcome || null,
          status: draft.status,
          reviewDate: draft.reviewDate || null,
        }),
      });
      const json = await response.json();
      if (!json.success) {
        toast.error(json.message ?? "Failed to save decision.");
        return;
      }
      toast.success("Decision saved.");
      fetchDecision();
      window.dispatchEvent(new CustomEvent("decision:updated"));
    } catch {
      toast.error("Failed to save decision.");
    } finally {
      setSaving(false);
    }
  }

  async function submitReview() {
    if (!decisionId) return;
    setReviewing(true);
    try {
      const response = await fetch("/api/v1/decisions/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: decisionId,
          outcome: draft.outcome || undefined,
          status: "REVIEWED",
        }),
      });
      const json = await response.json();
      if (!json.success) {
        toast.error(json.message ?? "Failed to record review.");
        return;
      }
      toast.success("Review recorded.");
      fetchDecision();
      window.dispatchEvent(new CustomEvent("decision:updated"));
    } catch {
      toast.error("Failed to record review.");
    } finally {
      setReviewing(false);
    }
  }

  async function runPremortem() {
    setSaving(true);
    try {
      const response = await fetch("/api/v1/decisions/premortem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title,
          context: draft.context,
          decision: draft.decision,
          alternatives: draft.alternatives || undefined,
          reasoning: draft.reasoning || undefined,
        }),
      });
      const json = await response.json();
      if (!json.success) {
        toast.error(json.message ?? "Pre-mortem failed.");
        return;
      }
      const evidence = json.data.evidence as string;
      setDraft((current) => ({
        ...current,
        evidence: current.evidence ? `${current.evidence}\n\n${evidence}` : evidence,
      }));
      toast.success("Pre-mortem added to evidence.");
    } catch {
      toast.error("Pre-mortem failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close decision details"
      />
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-6 py-4">
          <div className="min-w-0">
            {loading ? (
              <Skeleton className="h-6 w-64" />
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <Gavel className="h-4 w-4 text-primary" />
                  <h2 className="truncate text-lg font-semibold">{decision?.title ?? "Decision"}</h2>
                  {decision?.status ? (
                    <Badge className={cn(statusStyles[decision.status])}>
                      {DECISION_STATUS_LABELS[decision.status]}
                    </Badge>
                  ) : null}
                  {reviewDue ? (
                    <Badge variant="error" className="gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Review due
                    </Badge>
                  ) : null}
                </div>
                {decision?.owner ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Owner: {decision.owner.firstName} {decision.owner.lastName}
                  </p>
                ) : null}
              </>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {loading ? (
          <div className="space-y-4 p-6">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-6 lg:grid-cols-5">
            <div className="space-y-4 lg:col-span-3">
              <Field label="Title">
                <Input
                  value={draft.title}
                  onChange={(e) => setDraft((c) => ({ ...c, title: e.target.value }))}
                />
              </Field>
              <Field label="Context">
                <Textarea
                  rows={3}
                  value={draft.context}
                  onChange={(e) => setDraft((c) => ({ ...c, context: e.target.value }))}
                />
              </Field>
              <Field label="Alternatives">
                <Textarea
                  rows={2}
                  value={draft.alternatives}
                  onChange={(e) => setDraft((c) => ({ ...c, alternatives: e.target.value }))}
                />
              </Field>
              <Field label="Decision">
                <Textarea
                  rows={2}
                  value={draft.decision}
                  onChange={(e) => setDraft((c) => ({ ...c, decision: e.target.value }))}
                />
              </Field>
              <Field label="Reasoning">
                <Textarea
                  rows={2}
                  value={draft.reasoning}
                  onChange={(e) => setDraft((c) => ({ ...c, reasoning: e.target.value }))}
                />
              </Field>
              <Field label="Evidence">
                <Textarea
                  rows={4}
                  value={draft.evidence}
                  onChange={(e) => setDraft((c) => ({ ...c, evidence: e.target.value }))}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Status">
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={draft.status}
                    onChange={(e) => setDraft((c) => ({ ...c, status: e.target.value }))}
                  >
                    {selectableStatuses.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {decision && draft.status !== decision.status ? (
                    <p className="text-xs text-muted-foreground">
                      Next: {formatStatusTransition(decision.status, draft.status as DecisionStatus)}
                    </p>
                  ) : null}
                </Field>
                <Field label="Review date">
                  <Input
                    type="date"
                    value={draft.reviewDate}
                    onChange={(e) => setDraft((c) => ({ ...c, reviewDate: e.target.value }))}
                  />
                </Field>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={saveDecision} loading={saving}>
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={runPremortem} disabled={saving}>
                  <Sparkles className="mr-1 h-3.5 w-3.5" />
                  Run pre-mortem
                </Button>
              </div>
            </div>

            <div className="space-y-4 lg:col-span-2">
              <Card className={reviewDue ? "border-destructive/50" : undefined}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Outcome & review</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Field label="Outcome">
                    <Textarea
                      rows={4}
                      placeholder="What happened? Did the reasoning hold?"
                      value={draft.outcome}
                      onChange={(e) => setDraft((c) => ({ ...c, outcome: e.target.value }))}
                    />
                  </Field>
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={submitReview}
                    loading={reviewing}
                    disabled={decision?.status === "REVIEWED" || decision?.status === "SUPERSEDED"}
                  >
                    Mark reviewed
                  </Button>
                  {decision && decision.status === "PROPOSED" ? (
                    <p className="text-xs text-muted-foreground">
                      Approve or implement this decision before marking reviewed.
                    </p>
                  ) : null}
                </CardContent>
              </Card>

              {decision?.statusHistory && decision.statusHistory.length > 0 ? (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Status history</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 text-sm">
                      {decision.statusHistory.map((entry) => (
                        <li
                          key={entry.id}
                          className="border-b border-border pb-3 last:border-0 last:pb-0"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className={cn(statusStyles[entry.toStatus])}>
                              {formatStatusTransition(entry.fromStatus, entry.toStatus)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(entry.createdAt).toLocaleString()}
                            </span>
                          </div>
                          {entry.user ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {entry.user.firstName} {entry.user.lastName}
                            </p>
                          ) : null}
                          {entry.note ? (
                            <p className="mt-1 text-xs text-muted-foreground line-clamp-3">
                              {entry.note}
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ) : null}

              {similar.length > 0 ? (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Similar past decisions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 text-sm">
                      {similar.map((item) => (
                        <li key={item.id} className="border-b border-border pb-2 last:border-0">
                          <p className="font-medium">{item.title}</p>
                          <p className="text-muted-foreground">{item.relevance}</p>
                          {item.outcome ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              Outcome: {item.outcome}
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
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
