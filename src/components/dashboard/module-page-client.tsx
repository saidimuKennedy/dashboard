"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
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

export type CreateField = {
  name: string;
  label: string;
  type?: "text" | "textarea" | "number" | "select";
  required?: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
};

const DEFAULT_CREATE_FIELDS: CreateField[] = [
  {
    name: "title",
    label: "Title",
    required: true,
    placeholder: "Enter a title",
  },
  {
    name: "description",
    label: "Description",
    type: "textarea",
    placeholder: "Optional details",
  },
];

interface ModulePageClientProps {
  title: string;
  description: string;
  ctaLabel: string;
  endpoint: string;
  columns: string[];
  emptyTitle: string;
  emptyDescription: string;
  createFields?: CreateField[];
  createEnabled?: boolean;
  renderRow?: (item: Record<string, unknown>) => React.ReactNode;
}

export function ModulePageClient({
  title,
  description,
  ctaLabel,
  endpoint,
  columns,
  emptyTitle,
  emptyDescription,
  createFields = DEFAULT_CREATE_FIELDS,
  createEnabled = true,
  renderRow,
}: ModulePageClientProps) {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const createFormRef = useRef<HTMLDivElement>(null);

  const fetchItems = useCallback(() => {
    setLoading(true);
    fetch(endpoint)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          const data = json.data?.items ?? json.data ?? [];
          setItems(Array.isArray(data) ? data : []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [endpoint]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    function handleModuleUpdated() {
      fetchItems();
    }
    window.addEventListener("research:updated", handleModuleUpdated);
    window.addEventListener("journal:updated", handleModuleUpdated);
    return () => {
      window.removeEventListener("research:updated", handleModuleUpdated);
      window.removeEventListener("journal:updated", handleModuleUpdated);
    };
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

    const payload: Record<string, string | number> = {};
    for (const field of createFields) {
      const rawValue = formValues[field.name]?.trim() ?? "";
      if (field.required && !rawValue) {
        toast.error(`${field.label} is required`);
        return;
      }
      if (!rawValue) continue;

      if (field.type === "number") {
        const parsed = Number(rawValue);
        if (Number.isNaN(parsed)) {
          toast.error(`${field.label} must be a valid number`);
          return;
        }
        payload[field.name] = parsed;
      } else {
        payload[field.name] = rawValue;
      }
    }

    setSubmitting(true);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await response.json();

      if (json.success) {
        toast.success(json.message ?? "Created successfully");
        closeCreateForm();
        fetchItems();
        return;
      }

      toast.error(json.message ?? "Failed to create");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const createForm = creating ? (
    <Card ref={createFormRef}>
      <CardHeader>
        <CardTitle>{ctaLabel}</CardTitle>
        <CardDescription>Fill in the details below to create a new entry.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleCreateSubmit}>
          {createFields.map((field) => (
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
                    setFormValues((current) => ({
                      ...current,
                      [field.name]: event.target.value,
                    }))
                  }
                  disabled={submitting}
                />
              ) : field.type === "select" ? (
                <select
                  id={`create-${field.name}`}
                  className="flex h-9 w-full rounded-lg border border-input bg-muted/50 px-3 py-1 text-sm text-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={formValues[field.name] ?? ""}
                  onChange={(event) =>
                    setFormValues((current) => ({
                      ...current,
                      [field.name]: event.target.value,
                    }))
                  }
                  disabled={submitting}
                >
                  <option value="">Select {field.label.toLowerCase()}</option>
                  {field.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  id={`create-${field.name}`}
                  type={field.type === "number" ? "number" : "text"}
                  placeholder={field.placeholder}
                  value={formValues[field.name] ?? ""}
                  onChange={(event) =>
                    setFormValues((current) => ({
                      ...current,
                      [field.name]: event.target.value,
                    }))
                  }
                  disabled={submitting}
                />
              )}
            </div>
          ))}
          <div className="flex gap-2">
            <Button type="submit" loading={submitting}>
              {ctaLabel}
            </Button>
            <Button type="button" variant="outline" onClick={closeCreateForm} disabled={submitting}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  ) : null;

  const defaultRenderRow = (item: Record<string, unknown>) => (
    <TableRow key={String(item.id)}>
      <TableCell className="font-medium">{String(item.title ?? item.name ?? "—")}</TableCell>
      <TableCell>
        {item.status || item.stage ? (
          <Badge variant="secondary">{String(item.status ?? item.stage)}</Badge>
        ) : (
          "—"
        )}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {item.updatedAt
          ? new Date(String(item.updatedAt)).toLocaleDateString()
          : item.createdAt
            ? new Date(String(item.createdAt)).toLocaleDateString()
            : "—"}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {String(
          (item.author as { firstName?: string })?.firstName ??
            item.owner ??
            "—"
        )}
      </TableCell>
    </TableRow>
  );

  if (!loading && items.length > 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
          {createEnabled ? <Button onClick={openCreateForm}>{ctaLabel}</Button> : null}
        </div>
        {createForm}
        <div className="rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((col) => (
                  <TableHead key={col}>{col}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) =>
                renderRow ? renderRow(item) : defaultRenderRow(item)
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ModulePage
        title={title}
        description={description}
        ctaLabel={ctaLabel}
        onCtaClick={createEnabled ? openCreateForm : undefined}
        showCta={createEnabled}
        loading={loading}
        creating={creating}
        createForm={createForm}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
        columns={columns}
      />
    </div>
  );
}
