"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, Gavel, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { DecisionDetailModal } from "@/components/decisions/decision-detail-modal";
import { ModulePage } from "@/components/dashboard/module-page";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { decisionsCreateFields } from "@/config/module-create-fields";
import {
  DECISION_STATUS_LABELS,
  isReviewDue,
  type DecisionListItem,
  type SimilarDecision,
} from "@/types/decision";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  PROPOSED: "bg-muted text-muted-foreground border-border",
  APPROVED: "bg-primary/15 text-primary border-primary/30",
  IMPLEMENTED: "bg-success/15 text-success border-success/30",
  REVIEWED: "bg-warning/15 text-warning border-warning/30",
  SUPERSEDED: "bg-error/15 text-error border-error/30",
};

export function DecisionsPageClient() {
  const searchParams = useSearchParams();
  const [items, setItems] = useState<DecisionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [runPremortem, setRunPremortem] = useState(true);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [similar, setSimilar] = useState<SimilarDecision[]>([]);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const createFormRef = useRef<HTMLDivElement>(null);
  const similarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchItems = useCallback(() => {
    setLoading(true);
    fetch("/api/v1/decisions")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          const data = json.data?.items ?? json.data ?? [];
          setItems(Array.isArray(data) ? data : []);
        } else {
          toast.error(json.message ?? "Failed to load decisions.");
        }
      })
      .catch(() => toast.error("Failed to load decisions."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    const openId = searchParams.get("open");
    if (openId) setSelectedId(openId);
  }, [searchParams]);

  useEffect(() => {
    function handleUpdated() {
      fetchItems();
    }
    window.addEventListener("decision:updated", handleUpdated);
    return () => window.removeEventListener("decision:updated", handleUpdated);
  }, [fetchItems]);

  const fetchSimilar = useCallback((values: Record<string, string>) => {
    const title = values.title?.trim();
    const context = values.context?.trim();
    const decision = values.decision?.trim();
    if (!title || !context || !decision) {
      setSimilar([]);
      return;
    }

    setSimilarLoading(true);
    fetch("/api/v1/decisions/similar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, context, decision }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setSimilar(json.data?.items ?? []);
      })
      .catch(() => setSimilar([]))
      .finally(() => setSimilarLoading(false));
  }, []);

  function scheduleSimilarLookup(values: Record<string, string>) {
    if (similarTimerRef.current) clearTimeout(similarTimerRef.current);
    similarTimerRef.current = setTimeout(() => fetchSimilar(values), 600);
  }

  function updateField(name: string, value: string) {
    setFormValues((current) => {
      const next = { ...current, [name]: value };
      if (["title", "context", "decision"].includes(name)) {
        scheduleSimilarLookup(next);
      }
      return next;
    });
  }

  function openCreateForm() {
    setFormValues({ status: "APPROVED" });
    setSimilar([]);
    setRunPremortem(true);
    setCreating(true);
    requestAnimationFrame(() => {
      createFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function closeCreateForm() {
    setCreating(false);
    setFormValues({});
    setSimilar([]);
  }

  async function handleCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = formValues.title?.trim();
    const context = formValues.context?.trim();
    const decision = formValues.decision?.trim();
    if (!title || !context || !decision) {
      toast.error("Title, context, and decision are required.");
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, string | boolean> = {
        title,
        context,
        decision,
        runPremortem,
      };
      if (formValues.alternatives?.trim()) payload.alternatives = formValues.alternatives.trim();
      if (formValues.reasoning?.trim()) payload.reasoning = formValues.reasoning.trim();
      if (formValues.evidence?.trim()) payload.evidence = formValues.evidence.trim();
      if (formValues.status?.trim()) payload.status = formValues.status.trim();
      if (formValues.reviewDate?.trim()) payload.reviewDate = formValues.reviewDate.trim();

      const response = await fetch("/api/v1/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await response.json();
      if (json.success) {
        toast.success(json.message ?? "Decision logged.");
        closeCreateForm();
        fetchItems();
        if (json.data?.id) setSelectedId(json.data.id);
        return;
      }
      toast.error(json.message ?? "Failed to log decision.");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const createForm = creating ? (
    <Card ref={createFormRef}>
      <CardHeader>
        <CardTitle>Log Decision</CardTitle>
        <CardDescription>
          Capture context, alternatives, and reasoning. Enable pre-mortem to stress-test before saving.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleCreateSubmit}>
          {decisionsCreateFields.map((field) => (
            <div key={field.name} className="space-y-2">
              <label htmlFor={`create-${field.name}`} className="text-sm font-medium">
                {field.label}
                {field.required ? " *" : ""}
              </label>
              {field.type === "textarea" ? (
                <Textarea
                  id={`create-${field.name}`}
                  placeholder={field.placeholder}
                  value={formValues[field.name] ?? ""}
                  onChange={(event) => updateField(field.name, event.target.value)}
                  disabled={submitting}
                />
              ) : field.type === "select" ? (
                <select
                  id={`create-${field.name}`}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formValues[field.name] ?? field.options?.[0]?.value ?? ""}
                  onChange={(event) => updateField(field.name, event.target.value)}
                  disabled={submitting}
                >
                  {field.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : field.type === "date" ? (
                <Input
                  id={`create-${field.name}`}
                  type="date"
                  value={formValues[field.name] ?? ""}
                  onChange={(event) => updateField(field.name, event.target.value)}
                  disabled={submitting}
                />
              ) : (
                <Input
                  id={`create-${field.name}`}
                  placeholder={field.placeholder}
                  value={formValues[field.name] ?? ""}
                  onChange={(event) => updateField(field.name, event.target.value)}
                  disabled={submitting}
                />
              )}
            </div>
          ))}

          {similarLoading || similar.length > 0 ? (
            <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Similar past decisions
              </p>
              {similarLoading ? (
                <p className="text-sm text-muted-foreground">Checking institutional memory…</p>
              ) : (
                <ul className="space-y-2">
                  {similar.map((item) => (
                    <li key={item.id} className="text-sm">
                      <button
                        type="button"
                        className="font-medium text-primary hover:underline"
                        onClick={() => setSelectedId(item.id)}
                      >
                        {item.title}
                      </button>
                      <p className="text-muted-foreground">{item.relevance}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={runPremortem}
              onChange={(event) => setRunPremortem(event.target.checked)}
              disabled={submitting}
            />
            Run AI pre-mortem on save (risks, assumptions, reversal triggers)
          </label>

          <div className="flex gap-2">
            <Button type="submit" loading={submitting}>
              Log Decision
            </Button>
            <Button type="button" variant="outline" onClick={closeCreateForm} disabled={submitting}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  ) : null;

  const table = (
    <div className="rounded-xl border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Decision</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Review</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Owner</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const reviewDue = isReviewDue(item.reviewDate, item.status);
            return (
              <TableRow
                key={item.id}
                className="cursor-pointer hover:bg-muted/40"
                onClick={() => setSelectedId(item.id)}
              >
                <TableCell className="font-medium">{item.title}</TableCell>
                <TableCell>
                  <Badge className={cn(statusStyles[item.status])}>
                    {DECISION_STATUS_LABELS[item.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  {reviewDue ? (
                    <Badge variant="error" className="gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Due
                    </Badge>
                  ) : item.reviewDate ? (
                    <span className="text-muted-foreground text-sm">
                      {new Date(item.reviewDate).toLocaleDateString()}
                    </span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(item.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {item.owner?.firstName ?? "—"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );

  const header = (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
          <Gavel className="h-5 w-5 text-primary" />
          Decisions
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Institutional memory — context, rationale, outcomes, and review.
        </p>
      </div>
      <Button onClick={openCreateForm}>Log Decision</Button>
    </div>
  );

  if (!loading && items.length > 0) {
    return (
      <>
        <div className="space-y-6">
          {header}
          {createForm}
          {table}
        </div>
        <DecisionDetailModal decisionId={selectedId} onClose={() => setSelectedId(null)} />
      </>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <ModulePage
          title="Decisions"
          description="Institutional memory — context, rationale, outcomes, and review."
          ctaLabel="Log Decision"
          onCtaClick={openCreateForm}
          loading={loading}
          creating={creating}
          createForm={createForm}
          emptyTitle="No decisions logged"
          emptyDescription="Log manually, export AI chats, or extract from meeting notes."
          columns={["Decision", "Status", "Review", "Date", "Owner"]}
        />
      </div>
      <DecisionDetailModal decisionId={selectedId} onClose={() => setSelectedId(null)} />
    </>
  );
}
