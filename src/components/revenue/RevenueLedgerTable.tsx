import { formatCurrency } from "@/lib/utils";
import { REVENUE_STATUS_LABELS, REVENUE_TYPE_LABELS } from "@/lib/finance/constants";
import type { LedgerRow } from "@/lib/finance/reports";
import { Card } from "@/components/ui/card";

type Props = {
  rows: LedgerRow[];
};

export function RevenueLedgerTable({ rows }: Props) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border px-5 py-3">
        <h3 className="text-sm font-semibold">Recent revenue entries</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[800px] w-full text-sm">
          <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left">Date</th>
              <th className="px-4 py-2 text-left">Customer</th>
              <th className="px-4 py-2 text-left">Product</th>
              <th className="px-4 py-2 text-left">Type</th>
              <th className="px-4 py-2 text-right">Amount</th>
              <th className="px-4 py-2 text-center">Recurring</th>
              <th className="px-4 py-2 text-left">Contract</th>
              <th className="px-4 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  No revenue entries yet. Record your first entry below.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-border/40">
                  <td className="whitespace-nowrap px-4 py-2 text-muted-foreground">
                    {new Date(row.date).toLocaleDateString("en-KE", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-2 font-medium">{row.alias}</td>
                  <td className="px-4 py-2">{row.productName}</td>
                  <td className="px-4 py-2">{REVENUE_TYPE_LABELS[row.revenueType] ?? row.revenueType}</td>
                  <td className="px-4 py-2 text-right font-medium">{formatCurrency(row.amount)}</td>
                  <td className="px-4 py-2 text-center">{row.isRecurring ? "Yes" : "No"}</td>
                  <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                    {row.contractId ? `${row.contractId.slice(0, 8)}…` : "—"}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        row.status === "paid"
                          ? "bg-emerald-500/10 text-emerald-500"
                          : row.status === "overdue"
                            ? "bg-red-500/10 text-red-400"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {REVENUE_STATUS_LABELS[row.status] ?? row.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
