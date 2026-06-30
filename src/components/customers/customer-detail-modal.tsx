"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Bot,
  Calendar,
  Copy,
  Download,
  FileText,
  Palette,
  Pencil,
  Shield,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AiMarkdown, AiMessageContent } from "@/components/ai/ai-message-content";
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
import { cn } from "@/lib/utils";
import { downloadContractPdf } from "@/lib/contracts/generate-contract-pdf";
import {
  DEFAULT_CONTRACT_SETTINGS,
  enrichContract,
  parseCustomerAiAnalysis,
  type ContractTemplateSettings,
  type CustomerContract,
  type CustomerDetail,
} from "@/types/customer";
import { PDF_FONT_OPTIONS, pdfFontLabel } from "@/lib/contracts/markdown-to-pdf-blocks";

type Tab = "overview" | "contracts" | "settings" | "insights" | "discuss";

interface CustomerDetailModalProps {
  customerId: string | null;
  onClose: () => void;
}

const warningStyles = {
  critical: "bg-error/15 text-error border-error/30",
  warning: "bg-warning/15 text-warning border-warning/30",
  notice: "bg-primary/15 text-primary border-primary/30",
};

export function CustomerDetailModal({ customerId, onClose }: CustomerDetailModalProps) {
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [aliasInput, setAliasInput] = useState("");
  const [contractSettings, setContractSettings] = useState<ContractTemplateSettings>(DEFAULT_CONTRACT_SETTINGS);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [generateForm, setGenerateForm] = useState({
    terms: "",
    startDate: "",
    endDate: "",
    value: "",
    title: "",
  });

  const [retainerForm, setRetainerForm] = useState({
    parentId: "",
    title: "",
    terms: "",
    startDate: "",
    endDate: "",
    value: "",
  });

  const fetchCustomer = useCallback(() => {
    if (!customerId) return;
    setLoading(true);
    fetch(`/api/v1/customers/${customerId}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          const data = json.data as CustomerDetail;
          setCustomer(data);
          setAliasInput(data.alias?.alias ?? "");
          if (!data.alias?.alias) {
            fetch(`/api/v1/customers/${customerId}/alias`)
              .then((res) => res.json())
              .then((aliasJson) => {
                if (aliasJson.success) {
                  setAliasInput(aliasJson.data.alias);
                  setCustomer((current) =>
                    current ? { ...current, alias: aliasJson.data } : current
                  );
                }
              })
              .catch(() => {});
          }
        } else {
          toast.error(json.message ?? "Failed to load customer.");
        }
      })
      .catch(() => toast.error("Failed to load customer."))
      .finally(() => setLoading(false));
  }, [customerId]);

  useEffect(() => {
    if (!customerId) {
      setCustomer(null);
      setTab("overview");
      setChatMessages([]);
      setConversationId(null);
      return;
    }
    fetchCustomer();
    fetch("/api/v1/customers/contract-settings")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setContractSettings(json.data);
      })
      .catch(() => {});
  }, [customerId, fetchCustomer]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  async function saveAlias() {
    if (!customerId || !aliasInput.trim()) return;
    const response = await fetch(`/api/v1/customers/${customerId}/alias`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alias: aliasInput.trim() }),
    });
    const json = await response.json();
    if (json.success) {
      toast.success("Alias saved. Use this alias when discussing with AI.");
      fetchCustomer();
    } else {
      toast.error(json.message ?? "Failed to save alias.");
    }
  }

  async function runAnalysis() {
    if (!customerId) return;
    setAnalyzing(true);
    try {
      const response = await fetch(`/api/v1/customers/${customerId}/analyze`, { method: "POST" });
      const json = await response.json();
      if (json.success) {
        toast.success("Analysis complete.");
        fetchCustomer();
        window.dispatchEvent(new Event("customer:updated"));
      } else {
        toast.error(json.message ?? "Analysis failed.");
      }
    } catch {
      toast.error("Analysis failed.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function saveContractSettings(event: FormEvent) {
    event.preventDefault();
    setSettingsSaving(true);
    try {
      const response = await fetch("/api/v1/customers/contract-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contractSettings),
      });
      const json = await response.json();
      if (json.success) toast.success("Contract settings saved.");
      else toast.error(json.message ?? "Failed to save settings.");
    } catch {
      toast.error("Failed to save settings.");
    } finally {
      setSettingsSaving(false);
    }
  }

  async function generateContract(event: FormEvent) {
    event.preventDefault();
    if (!customerId) return;
    setGenerating(true);
    try {
      const response = await fetch(`/api/v1/customers/${customerId}/contracts/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          terms: generateForm.terms,
          startDate: generateForm.startDate,
          endDate: generateForm.endDate,
          value: generateForm.value ? Number(generateForm.value) : undefined,
          title: generateForm.title || undefined,
        }),
      });
      const json = await response.json();
      if (json.success) {
        toast.success("Contract ready — download the styled PDF below.");
        setGenerateForm({ terms: "", startDate: "", endDate: "", value: "", title: "" });
        fetchCustomer();
        window.dispatchEvent(new Event("customer:updated"));
      } else {
        toast.error(json.message ?? "Contract generation failed.");
      }
    } catch {
      toast.error("Contract generation failed.");
    } finally {
      setGenerating(false);
    }
  }

  async function addRetainer(event: FormEvent) {
    event.preventDefault();
    if (!customerId) return;
    try {
      const response = await fetch(`/api/v1/customers/${customerId}/contracts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: retainerForm.title,
          terms: retainerForm.terms,
          startDate: retainerForm.startDate,
          endDate: retainerForm.endDate,
          value: retainerForm.value ? Number(retainerForm.value) : undefined,
          isRetainer: true,
          parentId: retainerForm.parentId,
          status: "ACTIVE",
        }),
      });
      const json = await response.json();
      if (json.success) {
        toast.success("Retainer contract added.");
        setRetainerForm({ parentId: "", title: "", terms: "", startDate: "", endDate: "", value: "" });
        fetchCustomer();
      } else {
        toast.error(json.message ?? "Failed to add retainer.");
      }
    } catch {
      toast.error("Failed to add retainer.");
    }
  }

  async function sendChatMessage(event: FormEvent) {
    event.preventDefault();
    if (!customerId || !chatInput.trim() || chatLoading) return;

    const prompt = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: prompt }]);
    setChatLoading(true);

    try {
      const response = await fetch(`/api/v1/customers/${customerId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, conversationId: conversationId ?? undefined }),
      });
      const json = await response.json();
      if (json.success) {
        if (json.data.conversationId) setConversationId(json.data.conversationId);
        setChatMessages((prev) => [
          ...prev,
          { role: "assistant", content: json.data.response ?? "No response." },
        ]);
      } else {
        setChatMessages((prev) => [
          ...prev,
          { role: "assistant", content: json.message ?? "Chat failed." },
        ]);
      }
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Unable to reach AI service." },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  if (!customerId) return null;

  const analysis = parseCustomerAiAnalysis(customer?.aiAnalysis);
  const contracts = (customer?.contracts ?? []).map((c) =>
    enrichContract({
      ...c,
      value: c.value != null ? Number(c.value) : null,
      retainers: c.retainers?.map((r) => ({
        ...r,
        value: r.value != null ? Number(r.value) : null,
      })),
    } as CustomerContract)
  );
  const mainContract = contracts[0];
  const alias = customer?.alias?.alias;

  return (
    <DetailModalShell onClose={onClose} closeLabel="Close customer details" maxWidth="5xl">
        <div className={detailModalHeaderClassName()}>
          <div className="min-w-0 flex-1">
            {loading ? (
              <Skeleton className="h-6 w-64" />
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-lg font-semibold">{customer?.name ?? "Customer"}</h2>
                  {customer?.status ? (
                    <Badge variant="secondary" className="capitalize">
                      {customer.status.toLowerCase()}
                    </Badge>
                  ) : null}
                  {alias ? (
                    <Badge variant="outline" className="font-mono">
                      <Shield className="mr-1 h-3 w-3" />
                      {alias}
                    </Badge>
                  ) : null}
                </div>
                {customer?.company ? (
                  <p className="mt-0.5 text-sm text-muted-foreground">{customer.company}</p>
                ) : null}
              </>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {mainContract?.closureWarning ? (
          <div
            className={cn(
              "flex shrink-0 items-center gap-2 border-b px-6 py-2 text-sm",
              warningStyles[mainContract.closureWarning]
            )}
          >
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              Main contract &ldquo;{mainContract.title}&rdquo; ends in {mainContract.daysUntilEnd} days
              {mainContract.closureWarning === "critical" ? " — urgent renewal needed" : ""}
            </span>
          </div>
        ) : null}

        <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-border px-4">
          {(
            [
              ["overview", "Overview"],
              ["contracts", "Contracts"],
              ["settings", "Contract Style"],
              ["insights", "AI Insights"],
              ["discuss", "Discuss (AI)"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={cn(
                "shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                tab === key
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : tab === "overview" ? (
            <OverviewTab
              customer={customer}
              mainContract={mainContract}
              contracts={contracts}
              onUpdated={fetchCustomer}
            />
          ) : tab === "contracts" ? (
            <ContractsTab
              contracts={contracts}
              generateForm={generateForm}
              setGenerateForm={setGenerateForm}
              retainerForm={retainerForm}
              setRetainerForm={setRetainerForm}
              onGenerate={generateContract}
              onAddRetainer={addRetainer}
              generating={generating}
              contractSettings={contractSettings}
              clientName={customer?.name ?? "Client"}
              clientCompany={customer?.company}
            />
          ) : tab === "settings" ? (
            <SettingsTab
              settings={contractSettings}
              setSettings={setContractSettings}
              onSave={saveContractSettings}
              saving={settingsSaving}
            />
          ) : tab === "insights" ? (
            <InsightsTab analysis={analysis} onAnalyze={runAnalysis} analyzing={analyzing} alias={alias} />
          ) : (
            <DiscussTab
              alias={alias}
              aliasInput={aliasInput}
              setAliasInput={setAliasInput}
              onSaveAlias={saveAlias}
              messages={chatMessages}
              chatInput={chatInput}
              setChatInput={setChatInput}
              onSend={sendChatMessage}
              chatLoading={chatLoading}
              chatEndRef={chatEndRef}
            />
          )}
        </div>
    </DetailModalShell>
  );
}

function OverviewTab({
  customer,
  mainContract,
  contracts,
  onUpdated,
}: {
  customer: CustomerDetail | null;
  mainContract?: CustomerContract;
  contracts: CustomerContract[];
  onUpdated: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileDraft, setProfileDraft] = useState({
    company: "",
    industry: "",
    email: "",
    phone: "",
    notes: "",
  });

  useEffect(() => {
    if (!customer) return;
    setProfileDraft({
      company: customer.company ?? "",
      industry: customer.industry ?? "",
      email: customer.email ?? "",
      phone: customer.phone ?? "",
      notes: customer.notes ?? "",
    });
    setEditing(false);
  }, [customer]);

  async function saveProfile() {
    if (!customer) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/v1/customers/${customer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: profileDraft.company.trim() || null,
          industry: profileDraft.industry.trim() || null,
          email: profileDraft.email.trim() || null,
          phone: profileDraft.phone.trim() || null,
          notes: profileDraft.notes.trim() || null,
        }),
      });
      const json = await response.json();
      if (!json.success) {
        toast.error(json.message ?? "Failed to update profile.");
        return;
      }
      toast.success("Profile updated.");
      setEditing(false);
      onUpdated();
      window.dispatchEvent(new Event("customer:updated"));
    } catch {
      toast.error("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit() {
    if (!customer) return;
    setProfileDraft({
      company: customer.company ?? "",
      industry: customer.industry ?? "",
      email: customer.email ?? "",
      phone: customer.phone ?? "",
      notes: customer.notes ?? "",
    });
    setEditing(false);
  }

  if (!customer) return null;

  const productsLabel = customer.products?.map((p) => p.product.name).join(", ") || "—";
  const revenueLabel = customer.revenue?.length
    ? `KES ${customer.revenue.reduce((s, r) => s + Number(r.amount), 0).toLocaleString()}`
    : "—";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Profile</CardTitle>
          {!editing ? (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="mr-1 h-3.5 w-3.5" />
              Edit
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {editing ? (
            <>
              <ProfileField label="Company">
                <Input
                  value={profileDraft.company}
                  onChange={(e) => setProfileDraft((d) => ({ ...d, company: e.target.value }))}
                  placeholder="Company name"
                />
              </ProfileField>
              <ProfileField label="Industry">
                <Input
                  value={profileDraft.industry}
                  onChange={(e) => setProfileDraft((d) => ({ ...d, industry: e.target.value }))}
                  placeholder="e.g. Consultants"
                />
              </ProfileField>
              <ProfileField label="Email">
                <Input
                  type="email"
                  value={profileDraft.email}
                  onChange={(e) => setProfileDraft((d) => ({ ...d, email: e.target.value }))}
                  placeholder="email@example.com"
                />
              </ProfileField>
              <ProfileField label="Phone">
                <Input
                  type="tel"
                  value={profileDraft.phone}
                  onChange={(e) => setProfileDraft((d) => ({ ...d, phone: e.target.value }))}
                  placeholder="+254..."
                />
              </ProfileField>
              <ProfileField label="Notes">
                <Textarea
                  value={profileDraft.notes}
                  onChange={(e) => setProfileDraft((d) => ({ ...d, notes: e.target.value }))}
                  rows={3}
                  placeholder="Additional context about this customer"
                />
              </ProfileField>
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={saveProfile} disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </Button>
                <Button size="sm" variant="outline" onClick={cancelEdit} disabled={saving}>
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <>
              <Row label="Company" value={customer.company} />
              <Row label="Industry" value={customer.industry} />
              <Row label="Email" value={customer.email} />
              <Row label="Phone" value={customer.phone} />
              <Row label="Products" value={productsLabel} />
              <Row label="Total revenue" value={revenueLabel} />
              {customer.notes ? (
                <div className="pt-2">
                  <p className="text-xs font-medium text-muted-foreground">Notes</p>
                  <p className="mt-1 whitespace-pre-wrap">{customer.notes}</p>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            Main contract
          </CardTitle>
        </CardHeader>
        <CardContent>
          {mainContract ? (
            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{mainContract.title}</span>
                <Badge variant="secondary">{mainContract.status}</Badge>
                {mainContract.closureWarning ? (
                  <Badge className={warningStyles[mainContract.closureWarning]}>
                    {mainContract.daysUntilEnd}d remaining
                  </Badge>
                ) : null}
              </div>
              <div className="flex items-center gap-4 text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(mainContract.startDate).toLocaleDateString()} →{" "}
                  {new Date(mainContract.endDate).toLocaleDateString()}
                </span>
              </div>
              {mainContract.value != null ? (
                <p>
                  Value: {mainContract.currency} {mainContract.value.toLocaleString()}
                </p>
              ) : null}
              {mainContract.terms ? (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Terms</p>
                  <p className="mt-1 whitespace-pre-wrap">{mainContract.terms}</p>
                </div>
              ) : null}
              {mainContract.retainers && mainContract.retainers.length > 0 ? (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Retainer agreements ({mainContract.retainers.length})
                  </p>
                  <ul className="mt-2 space-y-1">
                    {mainContract.retainers.map((r) => (
                      <li key={r.id} className="rounded border border-border px-2 py-1.5 text-xs">
                        {r.title} — until {new Date(r.endDate).toLocaleDateString()}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No main contract yet. Use the Contracts tab to generate one with AI.
            </p>
          )}
        </CardContent>
      </Card>

      {contracts.length > 1 ? (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">All contracts</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {contracts.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded border px-3 py-2 text-sm">
                  <span>{c.title}</span>
                  <div className="flex items-center gap-2">
                    {c.closureWarning ? (
                      <AlertTriangle className={cn("h-3.5 w-3.5", c.closureWarning === "critical" && "text-error")} />
                    ) : null}
                    <span className="text-xs text-muted-foreground">
                      {new Date(c.endDate).toLocaleDateString()}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function ContractsTab({
  contracts,
  generateForm,
  setGenerateForm,
  retainerForm,
  setRetainerForm,
  onGenerate,
  onAddRetainer,
  generating,
  contractSettings,
  clientName,
  clientCompany,
}: {
  contracts: CustomerContract[];
  generateForm: { terms: string; startDate: string; endDate: string; value: string; title: string };
  setGenerateForm: React.Dispatch<React.SetStateAction<typeof generateForm>>;
  retainerForm: { parentId: string; title: string; terms: string; startDate: string; endDate: string; value: string };
  setRetainerForm: React.Dispatch<React.SetStateAction<typeof retainerForm>>;
  onGenerate: (e: FormEvent) => void;
  onAddRetainer: (e: FormEvent) => void;
  generating: boolean;
  contractSettings: ContractTemplateSettings;
  clientName: string;
  clientCompany?: string | null;
}) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            Generate contract with AI
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={onGenerate}>
            <Input
              placeholder="Contract title (optional)"
              value={generateForm.title}
              onChange={(e) => setGenerateForm((f) => ({ ...f, title: e.target.value }))}
            />
            <Textarea
              placeholder="Describe contract terms: scope, payment schedule, SLA, deliverables..."
              value={generateForm.terms}
              onChange={(e) => setGenerateForm((f) => ({ ...f, terms: e.target.value }))}
              rows={4}
              required
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start of contract</label>
                <Input
                  type="date"
                  value={generateForm.startDate}
                  onChange={(e) => setGenerateForm((f) => ({ ...f, startDate: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">End of contract</label>
                <Input
                  type="date"
                  value={generateForm.endDate}
                  onChange={(e) => setGenerateForm((f) => ({ ...f, endDate: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Value (KES)</label>
                <Input
                  type="number"
                  placeholder="Optional"
                  value={generateForm.value}
                  onChange={(e) => setGenerateForm((f) => ({ ...f, value: e.target.value }))}
                />
              </div>
            </div>
            <Button type="submit" loading={generating}>
              Generate with AI
            </Button>
          </form>
        </CardContent>
      </Card>

      {contracts.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add retainer to main contract</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={onAddRetainer}>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                value={retainerForm.parentId}
                onChange={(e) => setRetainerForm((f) => ({ ...f, parentId: e.target.value }))}
                required
              >
                <option value="">Select main contract</option>
                {contracts.filter((c) => !c.isRetainer).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
              <Input
                placeholder="Retainer title"
                value={retainerForm.title}
                onChange={(e) => setRetainerForm((f) => ({ ...f, title: e.target.value }))}
                required
              />
              <Textarea
                placeholder="Retainer terms"
                value={retainerForm.terms}
                onChange={(e) => setRetainerForm((f) => ({ ...f, terms: e.target.value }))}
                rows={2}
              />
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start of contract</label>
                  <Input
                    type="date"
                    value={retainerForm.startDate}
                    onChange={(e) => setRetainerForm((f) => ({ ...f, startDate: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">End of contract</label>
                  <Input
                    type="date"
                    value={retainerForm.endDate}
                    onChange={(e) => setRetainerForm((f) => ({ ...f, endDate: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Monthly value</label>
                  <Input
                    type="number"
                    placeholder="Optional"
                    value={retainerForm.value}
                    onChange={(e) => setRetainerForm((f) => ({ ...f, value: e.target.value }))}
                  />
                </div>
              </div>
              <Button type="submit" variant="outline">
                Add retainer
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {contracts.map((c) =>
        c.content ? (
          <ContractDocumentCard
            key={c.id}
            contract={c}
            settings={contractSettings}
            clientName={clientName}
            clientCompany={clientCompany}
          />
        ) : null
      )}
    </div>
  );
}

async function copyContractContent(content: string) {
  await navigator.clipboard.writeText(content);
  toast.success("Contract copied to clipboard");
}

async function handleDownloadContract(
  contract: CustomerContract,
  settings: ContractTemplateSettings,
  clientName: string,
  clientCompany?: string | null
) {
  try {
    await downloadContractPdf({ contract, settings, clientName, clientCompany });
    toast.success("Contract PDF downloaded");
  } catch {
    toast.error("Failed to generate PDF. Try again.");
  }
}

function ContractDocumentCard({
  contract,
  settings,
  clientName,
  clientCompany,
}: {
  contract: CustomerContract;
  settings: ContractTemplateSettings;
  clientName: string;
  clientCompany?: string | null;
}) {
  if (!contract.content) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="min-w-0 space-y-1">
          <CardTitle className="text-base">{contract.title}</CardTitle>
          <p className="text-xs text-muted-foreground">
            {new Date(contract.startDate).toLocaleDateString()} →{" "}
            {new Date(contract.endDate).toLocaleDateString()}
            {contract.value != null
              ? ` · ${contract.currency} ${contract.value.toLocaleString()}`
              : ""}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => copyContractContent(contract.content!)}
          >
            <Copy className="mr-1.5 h-3.5 w-3.5" />
            Copy
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleDownloadContract(contract, settings, clientName, clientCompany)}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Download PDF
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <pre className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded bg-muted/50 p-4 text-xs leading-relaxed">
          {contract.content}
        </pre>
      </CardContent>
    </Card>
  );
}

function SettingsTab({
  settings,
  setSettings,
  onSave,
  saving,
}: {
  settings: ContractTemplateSettings;
  setSettings: React.Dispatch<React.SetStateAction<ContractTemplateSettings>>;
  onSave: (e: FormEvent) => void;
  saving: boolean;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form className="space-y-4" onSubmit={onSave}>
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-primary" />
          <h3 className="font-medium">Contract PDF appearance</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          These settings are applied when you download a contract as PDF.
        </p>
        <div className="space-y-2">
          <label className="text-sm">Company name</label>
          <Input
            value={settings.companyName}
            onChange={(e) => setSettings((s) => ({ ...s, companyName: e.target.value }))}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm">Contact name</label>
            <Input
              value={settings.contactName}
              onChange={(e) => setSettings((s) => ({ ...s, contactName: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm">Contact email</label>
            <Input
              type="email"
              value={settings.contactEmail}
              onChange={(e) => setSettings((s) => ({ ...s, contactEmail: e.target.value }))}
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm">Location</label>
          <Input
            value={settings.location}
            onChange={(e) => setSettings((s) => ({ ...s, location: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm">Document label</label>
          <Input
            value={settings.documentLabel}
            onChange={(e) => setSettings((s) => ({ ...s, documentLabel: e.target.value }))}
            placeholder="Service Agreement"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm">Header color</label>
            <Input
              type="color"
              value={settings.headerColor}
              onChange={(e) => setSettings((s) => ({ ...s, headerColor: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm">Accent color</label>
            <Input
              type="color"
              value={settings.accentColor}
              onChange={(e) => setSettings((s) => ({ ...s, accentColor: e.target.value }))}
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm">PDF font (entire document)</label>
          <select
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            value={settings.fontFamily}
            onChange={(e) => setSettings((s) => ({ ...s, fontFamily: e.target.value }))}
          >
            {PDF_FONT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            One font is used consistently across the whole PDF — headers, body, and footer.
          </p>
        </div>
        <div className="space-y-2">
          <label className="text-sm">Payment / terms footer</label>
          <Textarea
            value={settings.paymentDetails}
            onChange={(e) => setSettings((s) => ({ ...s, paymentDetails: e.target.value }))}
            rows={3}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm">Closing footer text</label>
          <Input
            value={settings.footerText}
            onChange={(e) => setSettings((s) => ({ ...s, footerText: e.target.value }))}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.includeSignatureBlock}
            onChange={(e) => setSettings((s) => ({ ...s, includeSignatureBlock: e.target.checked }))}
          />
          Include signature block
        </label>
        <Button type="submit" loading={saving}>
          Save settings
        </Button>
      </form>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">PDF preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="rounded-lg border bg-white p-5 text-sm text-gray-900 shadow-sm"
            style={{
              fontFamily:
                settings.fontFamily === "times"
                  ? "Georgia, 'Times New Roman', serif"
                  : settings.fontFamily === "courier"
                    ? "Courier New, monospace"
                    : "Helvetica, Arial, sans-serif",
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p
                  className="text-lg font-bold tracking-wide"
                  style={{ color: settings.headerColor }}
                >
                  {settings.companyName.toUpperCase()}
                </p>
                <p className="mt-2 text-xs text-gray-500">{settings.contactName}</p>
                <p className="text-xs text-gray-500">{settings.contactEmail}</p>
                <p className="text-xs text-gray-500">{settings.location}</p>
              </div>
              <p
                className="text-right text-sm font-bold uppercase tracking-wide"
                style={{ color: settings.accentColor }}
              >
                {settings.documentLabel}
              </p>
            </div>
            <div className="my-4 border-t border-gray-200" />
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: settings.accentColor }}>
              Client
            </p>
            <p className="mt-1 font-semibold">[Client Name]</p>
            <div className="mt-4 rounded bg-gray-50 p-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-gray-400">Contract No.</p>
                  <p className="font-semibold">CTR-2026-001</p>
                </div>
                <div>
                  <p className="text-gray-400">Start Date</p>
                  <p className="font-semibold">1 June 2026</p>
                </div>
                <div>
                  <p className="text-gray-400">End Date</p>
                  <p className="font-semibold">1 June 2027</p>
                </div>
                <div>
                  <p className="text-gray-400">Value</p>
                  <p className="font-semibold">KES 9,000.00</p>
                </div>
              </div>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-gray-600">
              Contract body text appears here with your company branding applied.
            </p>
            {settings.includeSignatureBlock ? (
              <div className="mt-6 grid grid-cols-2 gap-6 border-t pt-4 text-xs">
                <div>
                  <p className="text-gray-400">Provider signature</p>
                  <div className="mt-8 border-b border-gray-300" />
                  <p className="mt-1 text-gray-500">{settings.companyName}</p>
                </div>
                <div>
                  <p className="text-gray-400">Client signature</p>
                  <div className="mt-8 border-b border-gray-300" />
                  <p className="mt-1 text-gray-500">[Client Name]</p>
                </div>
              </div>
            ) : null}
            {settings.paymentDetails ? (
              <div className="mt-4">
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: settings.accentColor }}>
                  Terms & Payment
                </p>
                <p className="mt-1 text-xs text-gray-500">{settings.paymentDetails}</p>
              </div>
            ) : null}
            <p className="mt-4 text-center text-[10px] italic text-gray-400">
              {settings.footerText} · {pdfFontLabel(settings.fontFamily as "helvetica" | "times" | "courier")}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InsightsTab({
  analysis,
  onAnalyze,
  analyzing,
  alias,
}: {
  analysis: ReturnType<typeof parseCustomerAiAnalysis>;
  onAnalyze: () => void;
  analyzing: boolean;
  alias?: string;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            Analysis uses masked alias {alias ? `"${alias}"` : ""} only — no PII is sent to AI.
          </p>
        </div>
        <Button onClick={onAnalyze} loading={analyzing}>
          <Sparkles className="mr-1 h-4 w-4" />
          Run analysis
        </Button>
      </div>

      {analysis ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Deal score</p>
                <p className="text-2xl font-semibold">{analysis.dealScore}/100</p>
                <Badge className="mt-1 capitalize">{analysis.dealVerdict}</Badge>
              </CardContent>
            </Card>
            <Card className="sm:col-span-2">
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Rationale</p>
                <p className="mt-1 text-sm">{analysis.dealRationale}</p>
              </CardContent>
            </Card>
          </div>

          <Section title="Summary" content={analysis.summary} />
          <Section title="Contract advice" items={analysis.contractAdvice} />
          {analysis.productRecommendations.length > 0 ? (
            <div>
              <h4 className="mb-2 text-sm font-medium">Product recommendations</h4>
              <div className="space-y-2">
                {analysis.productRecommendations.map((rec, i) => (
                  <div key={i} className="rounded border px-3 py-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{rec.productName}</span>
                      <Badge variant="secondary">{rec.fitScore}% fit</Badge>
                    </div>
                    <AiMarkdown content={rec.rationale} className="mt-1" />
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          No analysis yet. Run analysis to get deal scoring and product recommendations.
        </p>
      )}
    </div>
  );
}

function DiscussTab({
  alias,
  aliasInput,
  setAliasInput,
  onSaveAlias,
  messages,
  chatInput,
  setChatInput,
  onSend,
  chatLoading,
  chatEndRef,
}: {
  alias?: string;
  aliasInput: string;
  setAliasInput: (v: string) => void;
  onSaveAlias: () => void;
  messages: { role: "user" | "assistant"; content: string }[];
  chatInput: string;
  setChatInput: (v: string) => void;
  onSend: (e: FormEvent) => void;
  chatLoading: boolean;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="flex h-full min-h-[400px] flex-col gap-4">
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex flex-wrap items-end gap-3 pt-4">
          <div className="min-w-[200px] flex-1 space-y-1">
            <label className="flex items-center gap-1 text-xs font-medium">
              <Shield className="h-3 w-3" />
              Privacy alias (required for AI chat)
            </label>
            <Input
              value={aliasInput}
              onChange={(e) => setAliasInput(e.target.value.toUpperCase())}
              placeholder="CLI-AB12"
              className="font-mono"
            />
          </div>
          <Button variant="outline" size="sm" onClick={onSaveAlias}>
            Save alias
          </Button>
          <p className="w-full text-xs text-muted-foreground">
            Discuss this customer using alias <strong>{alias ?? "—"}</strong> only. Real names, emails, and phone
            numbers are blocked from reaching the AI.
          </p>
        </CardContent>
      </Card>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto rounded-lg border bg-muted/20 p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <Bot className="mb-2 h-8 w-8 opacity-50" />
            <p className="text-sm">Ask about deal strategy, renewals, or product fit using the alias.</p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "rounded-lg px-3 py-2 text-sm",
                msg.role === "user" ? "ml-8 bg-primary/15" : "mr-8 bg-muted"
              )}
            >
              <AiMessageContent content={msg.content} role={msg.role} />
            </div>
          ))
        )}
        <div ref={chatEndRef} />
      </div>

      <form className="flex gap-2" onSubmit={onSend}>
        <Input
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          placeholder={`Discuss ${alias ?? "customer"} — use alias only, no real names...`}
          disabled={chatLoading || !alias}
        />
        <Button type="submit" loading={chatLoading} disabled={!alias}>
          Send
        </Button>
      </form>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value ?? "—"}</span>
    </div>
  );
}

function ProfileField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function Section({ title, content, items }: { title: string; content?: string; items?: string[] }) {
  return (
    <div>
      <h4 className="mb-2 text-sm font-medium">{title}</h4>
      {content ? <AiMarkdown content={content} /> : null}
      {items?.length ? (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i}>
              <AiMarkdown content={item} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
