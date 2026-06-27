"use client";

import { useCallback, useEffect, useState } from "react";
import { Shield, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  COMPLIANCE_STATUS_LABELS,
  COMPLIANCE_STATUS_OPTIONS,
  RISK_LEVEL_LABELS,
  RISK_LEVEL_OPTIONS,
  type ComplianceDetail,
} from "@/types/compliance";

interface ComplianceDetailModalProps {
  itemId: string | null;
  onClose: () => void;
}

const statusStyles: Record<string, string> = {
  COMPLIANT: "bg-success/15 text-success border-success/30",
  AT_RISK: "bg-warning/15 text-warning border-warning/30",
  NON_COMPLIANT: "bg-error/15 text-error border-error/30",
  PENDING_REVIEW: "bg-muted text-muted-foreground border-border",
};

const levelStyles: Record<string, string> = {
  LOW: "bg-muted text-muted-foreground border-border",
  MEDIUM: "bg-primary/15 text-primary border-primary/30",
  HIGH: "bg-warning/15 text-warning border-warning/30",
  CRITICAL: "bg-error/15 text-error border-error/30",
};

export function ComplianceDetailModal({ itemId, onClose }: ComplianceDetailModalProps) {
  const [item, setItem] = useState<ComplianceDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [draft, setDraft] = useState({
    title: "",
    description: "",
    category: "",
    status: "PENDING_REVIEW",
    riskRating: "MEDIUM",
    deadline: "",
    evidence: "",
  });

  const fetchItem = useCallback(() => {
    if (!itemId) return;
    setLoading(true);
    fetch(`/api/v1/compliance/${itemId}`)
      .then((res) => res.json())
      .then((json) => {
        if (!json.success) {
          toast.error(json.message ?? "Failed to load compliance item.");
          return;
        }
        const data = json.data as ComplianceDetail;
        setItem(data);
        setDraft({
          title: data.title,
          description: data.description ?? "",
          category: data.category,
          status: data.status,
          riskRating: data.riskRating,
          deadline: data.deadline ? data.deadline.slice(0, 10) : "",
          evidence: data.evidence ?? "",
        });
      })
      .catch(() => toast.error("Failed to load compliance item."))
      .finally(() => setLoading(false));
  }, [itemId]);

  useEffect(() => {
    if (!itemId) {
      setItem(null);
      return;
    }
    fetchItem();
  }, [itemId, fetchItem]);

  if (!itemId) return null;

  async function saveItem() {
    if (!itemId || !draft.title.trim() || !draft.category.trim()) {
      toast.error("Title and category are required.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/v1/compliance/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title,
          description: draft.description || null,
          category: draft.category,
          status: draft.status,
          riskRating: draft.riskRating,
          deadline: draft.deadline || null,
          evidence: draft.evidence || null,
        }),
      });
      const json = await response.json();
      if (!json.success) {
        toast.error(json.message ?? "Failed to save compliance item.");
        return;
      }
      toast.success("Compliance item saved.");
      fetchItem();
      window.dispatchEvent(new CustomEvent("compliance:updated"));
    } catch {
      toast.error("Failed to save compliance item.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem() {
    if (!itemId) return;
    if (!window.confirm("Delete this compliance item? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/v1/compliance/${itemId}`, { method: "DELETE" });
      const json = await response.json();
      if (!json.success) {
        toast.error(json.message ?? "Failed to delete compliance item.");
        return;
      }
      toast.success("Compliance item deleted.");
      window.dispatchEvent(new CustomEvent("compliance:updated"));
      onClose();
    } catch {
      toast.error("Failed to delete compliance item.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close compliance details"
      />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-6 py-4">
          <div className="min-w-0">
            {loading ? (
              <Skeleton className="h-6 w-64" />
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <h2 className="truncate text-lg font-semibold">{item?.title ?? "Compliance"}</h2>
                {item ? (
                  <Badge className={cn("capitalize", statusStyles[item.status])}>
                    {COMPLIANCE_STATUS_LABELS[item.status]}
                  </Badge>
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
                <label htmlFor="compliance-title" className="text-sm font-medium">
                  Requirement
                </label>
                <Input
                  id="compliance-title"
                  value={draft.title}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, title: event.target.value }))
                  }
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="compliance-category" className="text-sm font-medium">
                  Category
                </label>
                <Input
                  id="compliance-category"
                  value={draft.category}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, category: event.target.value }))
                  }
                  disabled={saving}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="compliance-status" className="text-sm font-medium">
                    Status
                  </label>
                  <select
                    id="compliance-status"
                    className="flex h-9 w-full rounded-lg border border-input bg-muted/50 px-3 py-1 text-sm"
                    value={draft.status}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, status: event.target.value }))
                    }
                    disabled={saving}
                  >
                    {COMPLIANCE_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="compliance-risk-rating" className="text-sm font-medium">
                    Risk rating
                  </label>
                  <select
                    id="compliance-risk-rating"
                    className="flex h-9 w-full rounded-lg border border-input bg-muted/50 px-3 py-1 text-sm"
                    value={draft.riskRating}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, riskRating: event.target.value }))
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
                <label htmlFor="compliance-deadline" className="text-sm font-medium">
                  Due date
                </label>
                <Input
                  id="compliance-deadline"
                  type="date"
                  value={draft.deadline}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, deadline: event.target.value }))
                  }
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="compliance-description" className="text-sm font-medium">
                  Description
                </label>
                <Textarea
                  id="compliance-description"
                  value={draft.description}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, description: event.target.value }))
                  }
                  rows={4}
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="compliance-evidence" className="text-sm font-medium">
                  Evidence
                </label>
                <Textarea
                  id="compliance-evidence"
                  value={draft.evidence}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, evidence: event.target.value }))
                  }
                  rows={4}
                  placeholder="Documentation, audit notes, or links"
                  disabled={saving}
                />
              </div>

              {item ? (
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>
                    Risk:{" "}
                    <Badge className={cn("ml-1", levelStyles[item.riskRating])}>
                      {RISK_LEVEL_LABELS[item.riskRating]}
                    </Badge>
                  </span>
                  {item.deadline ? (
                    <span>Due {new Date(item.deadline).toLocaleDateString()}</span>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border px-6 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={deleteItem}
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
            <Button onClick={saveItem} loading={saving} disabled={loading || deleting}>
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
