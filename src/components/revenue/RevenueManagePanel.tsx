"use client";

import { useState } from "react";
import {
  ACQUISITION_SOURCE_LABELS,
  DEAL_STAGE_LABELS,
  EXPENSE_CATEGORY_LABELS,
  REVENUE_STATUS_LABELS,
  REVENUE_TYPE_LABELS,
} from "@/lib/finance/constants";
import { ChevronDown, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

type AccountOpt = { id: string; displayAlias: string };
type ProductOpt = { id: string; name: string };
type ContractOpt = { id: string; label: string };

type Props = {
  accounts: AccountOpt[];
  products: ProductOpt[];
  contracts: ContractOpt[];
  canManagePii: boolean;
  onSaved: () => void;
};

function Section({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="overflow-hidden rounded-xl">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/30"
      >
        <span className="inline-flex items-center gap-2">
          <Plus size={14} className="text-muted-foreground" />
          {title}
        </span>
        <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="border-t border-border px-4 pb-4 pt-4">{children}</div>}
    </Card>
  );
}

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await response.json();
  if (!json.success) throw new Error(json.message ?? "Request failed");
  return json;
}

export function RevenueManagePanel({
  accounts,
  products,
  contracts,
  canManagePii,
  onSaved,
}: Props) {
  const [pending, setPending] = useState(false);

  async function run(action: () => Promise<void>) {
    setPending(true);
    try {
      await action();
      toast.success("Saved.");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Capture services revenue data. Customer aliases appear in reports; legal names and contacts
        require founder/admin access.
      </p>

      <Section title="Record revenue" defaultOpen>
        <form
          className="grid grid-cols-1 gap-3 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            void run(async () => {
              await postJson("/api/v1/revenue", {
                customerId: String(fd.get("customerId")),
                productId: String(fd.get("productId")),
                contractId: String(fd.get("contractId") || "") || undefined,
                recordedAt: String(fd.get("recordedAt")),
                type: String(fd.get("type")),
                amount: Number(fd.get("amount")),
                isRecurring: fd.get("isRecurring") === "on",
                status: String(fd.get("status")),
                paymentMethod: String(fd.get("paymentMethod") || "") || undefined,
                invoiceRef: String(fd.get("invoiceRef") || "") || undefined,
                description: String(fd.get("description") || "") || undefined,
              });
              e.currentTarget.reset();
            });
          }}
        >
          <select name="customerId" required className={inputClass}>
            <option value="">Customer (alias)</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.displayAlias}
              </option>
            ))}
          </select>
          <select name="productId" required className={inputClass}>
            <option value="">Product</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select name="contractId" className={inputClass}>
            <option value="">Contract (optional)</option>
            {contracts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <input
            type="date"
            name="recordedAt"
            required
            className={inputClass}
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
          <select name="type" required className={inputClass}>
            {Object.entries(REVENUE_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <input
            type="number"
            name="amount"
            required
            min={0}
            step="0.01"
            placeholder="Amount (KES)"
            className={inputClass}
          />
          <select name="status" className={inputClass} defaultValue="paid">
            {Object.entries(REVENUE_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <input name="paymentMethod" placeholder="Payment method" className={inputClass} />
          {canManagePii && (
            <input name="invoiceRef" placeholder="Invoice ref (admin)" className={inputClass} />
          )}
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input type="checkbox" name="isRecurring" />
            Recurring
          </label>
          <input
            name="description"
            placeholder="Public-safe note"
            className={`${inputClass} md:col-span-2`}
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground disabled:opacity-50 md:col-span-2"
          >
            Save revenue entry
          </button>
        </form>
      </Section>

      <Section title="Add customer account">
        <form
          className="grid grid-cols-1 gap-3 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            void run(async () => {
              await postJson("/api/v1/revenue/accounts", {
                displayAlias: String(fd.get("displayAlias")),
                legalName: String(fd.get("legalName") || "") || undefined,
                industry: String(fd.get("industry") || "") || undefined,
                acquisitionSource: String(fd.get("acquisitionSource") || "") || undefined,
                email: String(fd.get("email") || "") || undefined,
                phone: String(fd.get("phone") || "") || undefined,
              });
              e.currentTarget.reset();
            });
          }}
        >
          <input
            name="displayAlias"
            required
            placeholder="Display alias (shown in reports)"
            className={inputClass}
          />
          <input name="industry" placeholder="Industry" className={inputClass} />
          <select name="acquisitionSource" className={inputClass}>
            <option value="">Acquisition source</option>
            {Object.entries(ACQUISITION_SOURCE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          {canManagePii && (
            <>
              <input name="legalName" placeholder="Legal name (admin only)" className={inputClass} />
              <input name="email" type="email" placeholder="Contact email" className={inputClass} />
              <input name="phone" placeholder="Contact phone" className={inputClass} />
            </>
          )}
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground disabled:opacity-50 md:col-span-2"
          >
            Save account
          </button>
        </form>
      </Section>

      <Section title="Add contract">
        <form
          className="grid grid-cols-1 gap-3 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            void run(async () => {
              await postJson("/api/v1/revenue/contracts", {
                customerId: String(fd.get("customerId")),
                productId: String(fd.get("productId")),
                mrr: Number(fd.get("mrr")),
                startDate: String(fd.get("startDate")),
                endDate: String(fd.get("renewalDate")),
                autoRenew: fd.get("autoRenew") === "on",
                status: "ACTIVE",
              });
              e.currentTarget.reset();
            });
          }}
        >
          <select name="customerId" required className={inputClass}>
            <option value="">Customer</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.displayAlias}
              </option>
            ))}
          </select>
          <select name="productId" required className={inputClass}>
            <option value="">Product</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            name="mrr"
            required
            min={0}
            step="0.01"
            placeholder="MRR (KES)"
            className={inputClass}
          />
          <input
            type="date"
            name="startDate"
            required
            className={inputClass}
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
          <input type="date" name="renewalDate" required className={inputClass} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="autoRenew" defaultChecked />
            Auto-renew
          </label>
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground disabled:opacity-50 md:col-span-2"
          >
            Save contract
          </button>
        </form>
      </Section>

      <Section title="Record expense">
        <form
          className="grid grid-cols-1 gap-3 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            void run(async () => {
              await postJson("/api/v1/expenses", {
                recordedAt: String(fd.get("recordedAt")),
                category: String(fd.get("category")),
                amount: Number(fd.get("amount")),
                description: String(fd.get("description") || "") || undefined,
              });
              e.currentTarget.reset();
            });
          }}
        >
          <input
            type="date"
            name="recordedAt"
            required
            className={inputClass}
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
          <select name="category" required className={inputClass}>
            {Object.entries(EXPENSE_CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <input
            type="number"
            name="amount"
            required
            min={0}
            step="0.01"
            placeholder="Amount (KES)"
            className={inputClass}
          />
          <input name="description" placeholder="Description" className={inputClass} />
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground disabled:opacity-50 md:col-span-2"
          >
            Save expense
          </button>
        </form>
      </Section>

      <Section title="Pipeline deal">
        <form
          className="grid grid-cols-1 gap-3 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            void run(async () => {
              await postJson("/api/v1/sales-deals", {
                customerId: String(fd.get("customerId")),
                productId: String(fd.get("productId") || "") || undefined,
                stage: String(fd.get("stage")),
                expectedValue: Number(fd.get("expectedValue")),
                probabilityPercent: Number(fd.get("probabilityPercent")),
                expectedCloseDate: String(fd.get("expectedCloseDate") || "") || undefined,
              });
              e.currentTarget.reset();
            });
          }}
        >
          <select name="customerId" required className={inputClass}>
            <option value="">Customer</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.displayAlias}
              </option>
            ))}
          </select>
          <select name="productId" className={inputClass}>
            <option value="">Product (optional)</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select name="stage" className={inputClass} defaultValue="qualified">
            {Object.entries(DEAL_STAGE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <input
            type="number"
            name="expectedValue"
            required
            min={0}
            placeholder="Expected value (KES)"
            className={inputClass}
          />
          <input
            type="number"
            name="probabilityPercent"
            defaultValue={40}
            min={0}
            max={100}
            placeholder="Probability %"
            className={inputClass}
          />
          <input type="date" name="expectedCloseDate" className={inputClass} />
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground disabled:opacity-50 md:col-span-2"
          >
            Save deal
          </button>
        </form>
      </Section>

      {canManagePii && (
        <Section title="Cash snapshot (runway)">
          <form
            className="grid grid-cols-1 gap-3 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              void run(async () => {
                await postJson("/api/v1/cash-snapshots", {
                  asOfDate: String(fd.get("asOfDate")),
                  balance: Number(fd.get("balance")),
                  notes: String(fd.get("notes") || "") || undefined,
                });
                e.currentTarget.reset();
              });
            }}
          >
            <input
              type="date"
              name="asOfDate"
              required
              className={inputClass}
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
            <input
              type="number"
              name="balance"
              required
              min={0}
              placeholder="Cash balance (KES)"
              className={inputClass}
            />
            <input name="notes" placeholder="Notes" className={`${inputClass} md:col-span-2`} />
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground disabled:opacity-50 md:col-span-2"
            >
              Save cash snapshot
            </button>
          </form>
        </Section>
      )}
    </div>
  );
}
