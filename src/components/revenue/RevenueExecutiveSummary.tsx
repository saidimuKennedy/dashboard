import { formatCurrency } from "@/lib/utils";
import type { ExecutiveSummary, RevenueHighlights } from "@/lib/finance/reports";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";

function ChangeBadge({ pct }: { pct: number | null }) {
  if (pct == null) return null;
  const up = pct >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium ${up ? "text-emerald-500" : "text-red-400"}`}
    >
      {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {up ? "+" : ""}
      {pct}%
    </span>
  );
}

type Props = {
  executive: ExecutiveSummary;
  highlights: RevenueHighlights;
};

export function RevenueExecutiveSummary({ executive: e, highlights: h }: Props) {
  const cards = [
    { label: "MRR", value: formatCurrency(e.mrr), change: e.mrrChangePct },
    { label: "ARR", value: formatCurrency(e.arr), change: null },
    { label: "Revenue (month)", value: formatCurrency(e.revenueThisMonth), change: e.revenueChangePct },
    { label: "One-time revenue", value: formatCurrency(e.oneTimeRevenue), change: null },
    { label: "Support revenue", value: formatCurrency(e.supportRevenue), change: null },
    { label: "Gross revenue", value: formatCurrency(e.grossRevenue), change: null },
    { label: "Forecast (next month)", value: formatCurrency(e.forecastNextMonth), change: null },
    { label: "Profit margin", value: e.profitMarginPct != null ? `${e.profitMarginPct}%` : "—", change: null },
    { label: "Net profit", value: formatCurrency(e.netProfit), change: null },
    { label: "Runway", value: e.runwayMonths != null ? `${e.runwayMonths} mo` : "—", change: null },
    {
      label: "Cash available",
      value: e.cashAvailable != null ? formatCurrency(e.cashAvailable) : "—",
      change: null,
    },
    {
      label: "Active customers",
      value: String(e.activeAccountCount),
      change: null,
      sub:
        e.customerChange !== 0
          ? `${e.customerChange >= 0 ? "+" : ""}${e.customerChange} vs last month`
          : undefined,
    },
  ];

  const highlightItems = [
    h.topProduct ? { label: "Top product", value: `${h.topProduct.name} (${h.topProduct.sharePct}%)` } : null,
    h.fastestGrowing
      ? { label: "Fastest growing", value: `${h.fastestGrowing.name} (+${h.fastestGrowing.growthPct}%)` }
      : null,
    h.highestChurnRisk
      ? { label: "Highest churn risk", value: `${h.highestChurnRisk.label} (${h.highestChurnRisk.count})` }
      : null,
    h.largestCustomer
      ? { label: "Largest customer", value: `${h.largestCustomer.alias} — ${formatCurrency(h.largestCustomer.mrr)} MRR` }
      : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="rounded-xl p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{c.label}</p>
            <p className="mt-1 text-lg font-semibold">{c.value}</p>
            <div className="mt-1 flex items-center gap-2">
              <ChangeBadge pct={c.change} />
              {"sub" in c && c.sub ? <span className="text-xs text-muted-foreground">{c.sub}</span> : null}
            </div>
          </Card>
        ))}
      </div>

      {highlightItems.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {highlightItems.map((item) => (
            <div key={item.label} className="rounded-xl border border-border bg-muted/20 px-4 py-3">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="mt-0.5 truncate text-sm font-medium">{item.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
