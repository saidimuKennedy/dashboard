"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  DetailModalShell,
  detailModalActionsClassName,
  detailModalHeaderClassName,
} from "@/components/ui/detail-modal-shell";
import { cn } from "@/lib/utils";
import {
  RISK_CATEGORY_LABELS,
  RISK_CATEGORY_OPTIONS,
  RISK_LEVEL_LABELS,
  RISK_LEVEL_OPTIONS,
  type RiskDetail,
} from "@/types/risk";

interface RiskDetailModalProps {
  riskId: string | null;
  onClose: () => void;
}

const levelStyles: Record<string, string> = {
  LOW: "bg-muted text-muted-foreground border-border",
  MEDIUM: "bg-primary/15 text-primary border-primary/30",
  HIGH: "bg-warning/15 text-warning border-warning/30",
  CRITICAL: "bg-error/15 text-error border-error/30",
};

export function RiskDetailModal({ riskId, onClose }: RiskDetailModalProps) {
  const [risk, setRisk] = useState<RiskDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [draft, setDraft] = useState({
    title: "",
    description: "",
    category: "OPERATIONAL",
    level: "MEDIUM",
    mitigation: "",
    reviewDate: "",
  });

  const fetchRisk = useCallback(() => {
    if (!riskId) return;
    setLoading(true);
    fetch(`/api/v1/risks/${riskId}`)
      .then((res) => res.json())
      .then((json) => {
        if (!json.success) {
          toast.error(json.message ?? "Failed to load risk.");
          return;
        }
        const data = json.data as RiskDetail;
        setRisk(data);
        setDraft({
          title: data.title,
          description: data.description ?? "",
          category: data.category,
          level: data.level,
          mitigation: data.mitigation ?? "",
          reviewDate: data.reviewDate ? data.reviewDate.slice(0, 10) : "",
        });
      })
      .catch(() => toast.error("Failed to load risk."))
      .finally(() => setLoading(false));
  }, [riskId]);

  useEffect(() => {
    if (!riskId) {
      setRisk(null);
      return;
    }
    fetchRisk();
  }, [riskId, fetchRisk]);

  if (!riskId) return null;

  async function saveRisk() {
    if (!riskId || !draft.title.trim()) {
      toast.error("Title is required.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/v1/risks/${riskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title,
          description: draft.description || null,
          category: draft.category,
          level: draft.level,
          mitigation: draft.mitigation || null,
          reviewDate: draft.reviewDate || null,
        }),
      });
      const json = await response.json();
      if (!json.success) {
        toast.error(json.message ?? "Failed to save risk.");
        return;
      }
      toast.success("Risk saved.");
      fetchRisk();
      window.dispatchEvent(new CustomEvent("risk:updated"));
    } catch {
      toast.error("Failed to save risk.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteRisk() {
    if (!riskId) return;
    if (!window.confirm("Delete this risk? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/v1/risks/${riskId}`, { method: "DELETE" });
      const json = await response.json();
      if (!json.success) {
        toast.error(json.message ?? "Failed to delete risk.");
        return;
      }
      toast.success("Risk deleted.");
      window.dispatchEvent(new CustomEvent("risk:updated"));
      onClose();
    } catch {
      toast.error("Failed to delete risk.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <DetailModalShell onClose={onClose} closeLabel="Close risk details" maxWidth="2xl">
        <div className={detailModalHeaderClassName()}>
          <div className="min-w-0 flex-1">
            {loading ? (
              <Skeleton className="h-6 w-64" />
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <h2 className="truncate text-lg font-semibold">{risk?.title ?? "Risk"}</h2>
                {risk ? (
                  <>
                    <Badge className={cn("capitalize", levelStyles[risk.level])}>
                      {RISK_LEVEL_LABELS[risk.level]}
                    </Badge>
                    <Badge variant="secondary">{RISK_CATEGORY_LABELS[risk.category]}</Badge>
                  </>
                ) : null}
              </div>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="risk-title" className="text-sm font-medium">
                  Risk
                </label>
                <Input
                  id="risk-title"
                  value={draft.title}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, title: event.target.value }))
                  }
                  disabled={saving}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="risk-category" className="text-sm font-medium">
                    Category
                  </label>
                  <select
                    id="risk-category"
                    className="flex h-9 w-full rounded-lg border border-input bg-muted/50 px-3 py-1 text-sm"
                    value={draft.category}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, category: event.target.value }))
                    }
                    disabled={saving}
                  >
                    {RISK_CATEGORY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="risk-level" className="text-sm font-medium">
                    Level
                  </label>
                  <select
                    id="risk-level"
                    className="flex h-9 w-full rounded-lg border border-input bg-muted/50 px-3 py-1 text-sm"
                    value={draft.level}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, level: event.target.value }))
                    }
                    disabled={saving}
                  >
                    {RISK_LEVEL_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="risk-review-date" className="text-sm font-medium">
                  Review date
                </label>
                <Input
                  id="risk-review-date"
                  type="date"
                  value={draft.reviewDate}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, reviewDate: event.target.value }))
                  }
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="risk-description" className="text-sm font-medium">
                  Description
                </label>
                <Textarea
                  id="risk-description"
                  value={draft.description}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, description: event.target.value }))
                  }
                  rows={4}
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="risk-mitigation" className="text-sm font-medium">
                  Mitigation
                </label>
                <Textarea
                  id="risk-mitigation"
                  value={draft.mitigation}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, mitigation: event.target.value }))
                  }
                  rows={4}
                  placeholder="How will you reduce or manage this risk?"
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
            onClick={deleteRisk}
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
            <Button onClick={saveRisk} loading={saving} disabled={loading || deleting}>
              Save
            </Button>
          </div>
        </div>
    </DetailModalShell>
  );
}
