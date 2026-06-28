"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ResearchDetailModal } from "@/components/research/research-detail-modal";
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
import { researchCreateFields } from "@/config/module-create-fields";
import { parseResearchAiAnalysis, RESEARCH_STAGE_LABELS } from "@/types/research";

type ResearchListItem = {
  id: string;
  title: string;
  stage?: string;
  updatedAt?: string;
  createdAt?: string;
  aiAnalysis?: unknown;
  author?: { firstName?: string };
};

export function ResearchPageClient() {
  const searchParams = useSearchParams();
  const [items, setItems] = useState<ResearchListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const createFormRef = useRef<HTMLDivElement>(null);

  const fetchItems = useCallback(() => {
    setLoading(true);
    fetch("/api/v1/research")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          const data = json.data?.items ?? json.data ?? [];
          setItems(Array.isArray(data) ? data : []);
        } else {
          toast.error(json.message ?? "Failed to load research topics.");
        }
      })
      .catch(() => toast.error("Failed to load research topics."))
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
    function handleResearchUpdated() {
      fetchItems();
    }
    window.addEventListener("research:updated", handleResearchUpdated);
    return () => window.removeEventListener("research:updated", handleResearchUpdated);
  }, [fetchItems]);

  function openCreateForm() {
    setFormValues({});
    setCreating(true);
    requestAnimationFrame(() => {
      createFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function closeCreateForm() {
    setCreating(false);
    setFormValues({});
  }

  async function handleCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = formValues.title?.trim();
    if (!title) {
      toast.error("Title is required");
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, string> = { title };
      const description = formValues.description?.trim();
      if (description) payload.description = description;

      const response = await fetch("/api/v1/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await response.json();
      if (json.success) {
        toast.success(json.message ?? "Research topic created.");
        closeCreateForm();
        fetchItems();
        return;
      }
      toast.error(json.message ?? "Failed to create research topic.");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const createForm = creating ? (
    <Card ref={createFormRef}>
      <CardHeader>
        <CardTitle>New Research Topic</CardTitle>
        <CardDescription>Fill in the details below to create a new entry.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleCreateSubmit}>
          {researchCreateFields.map((field) => (
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
                  onChange={(event) =>
                    setFormValues((current) => ({ ...current, [field.name]: event.target.value }))
                  }
                  disabled={submitting}
                />
              ) : (
                <Input
                  id={`create-${field.name}`}
                  placeholder={field.placeholder}
                  value={formValues[field.name] ?? ""}
                  onChange={(event) =>
                    setFormValues((current) => ({ ...current, [field.name]: event.target.value }))
                  }
                  disabled={submitting}
                />
              )}
            </div>
          ))}
          <div className="flex gap-2">
            <Button type="submit" loading={submitting}>
              New Research Topic
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
            <TableHead>Title</TableHead>
            <TableHead>Importance</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead>Author</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const analysis = parseResearchAiAnalysis(item.aiAnalysis);
            return (
              <TableRow
                key={item.id}
                className="cursor-pointer hover:bg-muted/40"
                onClick={() => setSelectedId(item.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedId(item.id);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <TableCell className="font-medium">{item.title}</TableCell>
                <TableCell>
                  {analysis ? (
                    <Badge variant="secondary">{analysis.importanceScore}/100</Badge>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>
                  {item.stage ? (
                    <Badge variant="secondary">
                      {RESEARCH_STAGE_LABELS[item.stage] ?? item.stage}
                    </Badge>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {item.updatedAt
                    ? new Date(item.updatedAt).toLocaleDateString()
                    : item.createdAt
                      ? new Date(item.createdAt).toLocaleDateString()
                      : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {item.author?.firstName ?? "—"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );

  if (!loading && items.length > 0) {
    return (
      <>
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Research</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Track market research, competitive analysis, and product discovery.
              </p>
            </div>
            <Button onClick={openCreateForm}>New Research Topic</Button>
          </div>
          {createForm}
          {table}
        </div>
        <ResearchDetailModal researchId={selectedId} onClose={() => setSelectedId(null)} />
      </>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <ModulePage
          title="Research"
          description="Track market research, competitive analysis, and product discovery."
          ctaLabel="New Research Topic"
          onCtaClick={openCreateForm}
          loading={loading}
          creating={creating}
          createForm={createForm}
          emptyTitle="No research topics"
          emptyDescription="Export AI chats as research items or create one manually."
          columns={["Title", "Importance", "Stage", "Updated", "Author"]}
        />
      </div>
      <ResearchDetailModal researchId={selectedId} onClose={() => setSelectedId(null)} />
    </>
  );
}
