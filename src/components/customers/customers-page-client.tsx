"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";
import { CustomerDetailModal } from "@/components/customers/customer-detail-modal";
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
import { Skeleton } from "@/components/ui/skeleton";
import { customersCreateFields } from "@/config/module-create-fields";
import {
  getContractClosureWarning,
  type CustomerListItem,
  type PortfolioCustomerInsight,
} from "@/types/customer";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  PROSPECT: "bg-primary/15 text-primary border-primary/30",
  ACTIVE: "bg-success/15 text-success border-success/30",
  CHURNED: "bg-error/15 text-error border-error/30",
  ARCHIVED: "bg-muted text-muted-foreground border-border",
};

export function CustomersPageClient() {
  const searchParams = useSearchParams();
  const [items, setItems] = useState<CustomerListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioCustomerInsight[]>([]);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const createFormRef = useRef<HTMLDivElement>(null);

  const fetchItems = useCallback(() => {
    setLoading(true);
    fetch("/api/v1/customers")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          const data = json.data?.items ?? json.data ?? [];
          setItems(Array.isArray(data) ? data : []);
        } else {
          toast.error(json.message ?? "Failed to load customers.");
        }
      })
      .catch(() => toast.error("Failed to load customers."))
      .finally(() => setLoading(false));
  }, []);

  const fetchPortfolio = useCallback(() => {
    setPortfolioLoading(true);
    fetch("/api/v1/customers/portfolio-analysis")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setPortfolio(json.data?.insights ?? []);
      })
      .catch(() => {})
      .finally(() => setPortfolioLoading(false));
  }, []);

  useEffect(() => {
    fetchItems();
    fetchPortfolio();
  }, [fetchItems, fetchPortfolio]);

  useEffect(() => {
    const openId = searchParams.get("open");
    if (openId) setSelectedId(openId);
  }, [searchParams]);

  useEffect(() => {
    function handleUpdated() {
      fetchItems();
      fetchPortfolio();
    }
    window.addEventListener("customer:updated", handleUpdated);
    return () => window.removeEventListener("customer:updated", handleUpdated);
  }, [fetchItems, fetchPortfolio]);

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
    const name = formValues.name?.trim();
    if (!name) {
      toast.error("Name is required");
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, string> = { name };
      for (const field of customersCreateFields) {
        if (field.name === "name") continue;
        const value = formValues[field.name]?.trim();
        if (value) payload[field.name] = value;
      }

      const response = await fetch("/api/v1/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await response.json();
      if (json.success) {
        toast.success(json.message ?? "Customer created.");
        closeCreateForm();
        fetchItems();
        if (json.data?.id) setSelectedId(json.data.id);
        return;
      }
      toast.error(json.message ?? "Failed to create customer.");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const createForm = creating ? (
    <Card ref={createFormRef}>
      <CardHeader>
        <CardTitle>New Customer</CardTitle>
        <CardDescription>Add a customer to track contracts, revenue, and AI insights.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleCreateSubmit}>
          {customersCreateFields.map((field) => (
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
              Add Customer
            </Button>
            <Button type="button" variant="outline" onClick={closeCreateForm} disabled={submitting}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  ) : null;

  const portfolioBanner =
    portfolio.length > 0 || portfolioLoading ? (
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">AI Portfolio — Best Deals</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchPortfolio} disabled={portfolioLoading}>
              Refresh
            </Button>
          </div>
          <CardDescription>Ranked by deal quality using masked aliases only — no PII sent to AI.</CardDescription>
        </CardHeader>
        <CardContent>
          {portfolioLoading ? (
            <div className="flex gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 flex-1" />
              ))}
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {portfolio.slice(0, 6).map((insight) => (
                <button
                  key={insight.alias}
                  type="button"
                  className="rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary/40"
                  onClick={() => insight.customerId && setSelectedId(insight.customerId)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-muted-foreground">#{insight.dealRank ?? "—"}</span>
                    <Badge variant="secondary">{insight.alias}</Badge>
                    <span className="text-sm font-semibold">{insight.dealScore}/100</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{insight.summary}</p>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    ) : null;

  if (loading && items.length === 0) {
    return (
      <ModulePage
        title="Customers"
        description="Customer relationships, timelines, and AI insights."
        ctaLabel="Add Customer"
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground">
            Customer relationships, contracts, timelines, and AI insights.
          </p>
        </div>
        {!creating ? (
          <Button onClick={openCreateForm}>Add Customer</Button>
        ) : null}
      </div>

      {portfolioBanner}
      {createForm}

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="mb-4 h-10 w-10 text-muted-foreground/50" />
            <h3 className="text-lg font-medium">No customers</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Add your first customer to start tracking relationships and contracts.
            </p>
            {!creating ? (
              <Button className="mt-4" onClick={openCreateForm}>
                Add Customer
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Contract</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const contract = item.contracts?.[0];
                const closure = contract ? getContractClosureWarning(contract.endDate) : null;
                return (
                  <TableRow
                    key={item.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedId(item.id)}
                  >
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>
                      <Badge className={cn("capitalize", statusStyles[item.status ?? "ACTIVE"])}>
                        {(item.status ?? "ACTIVE").toLowerCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {contract ? (
                        <div className="flex items-center gap-1.5">
                          {closure?.warning ? (
                            <AlertTriangle
                              className={cn(
                                "h-3.5 w-3.5",
                                closure.warning === "critical" && "text-error",
                                closure.warning === "warning" && "text-warning",
                                closure.warning === "notice" && "text-primary"
                              )}
                            />
                          ) : null}
                          <span className="text-xs text-muted-foreground">
                            {closure?.daysUntilEnd != null && closure.daysUntilEnd >= 0
                              ? `${closure.daysUntilEnd}d left`
                              : "Expired"}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">No contract</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{item.company ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <CustomerDetailModal
        customerId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
