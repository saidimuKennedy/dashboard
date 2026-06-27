import { formatCurrency } from "@/lib/utils";
import { Card } from "@/components/ui/card";

type Slice = { label: string; amount: number };

type Props = {
  byIndustry: Slice[];
  bySource: Slice[];
};

export function RevenueIntelligenceBreakdown({ byIndustry, bySource }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <BreakdownCard title="Revenue by industry" rows={byIndustry} />
      <BreakdownCard title="Revenue by acquisition source" rows={bySource} />
    </div>
  );
}

function BreakdownCard({ title, rows }: { title: string; rows: Slice[] }) {
  const total = rows.reduce((s, r) => s + r.amount, 0);
  return (
    <Card className="rounded-2xl p-5">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No paid revenue this month.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.label} className="flex items-center justify-between gap-4 text-sm">
              <span className="truncate">{row.label}</span>
              <span className="shrink-0 text-muted-foreground">
                {formatCurrency(row.amount)}
                {total > 0 ? ` (${Math.round((row.amount / total) * 100)}%)` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
