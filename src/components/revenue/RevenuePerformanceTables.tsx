import { formatCurrency } from "@/lib/utils";
import type { TopAccountRow, TopProductRow } from "@/lib/finance/reports";
import { Card } from "@/components/ui/card";

type Props = {
  topAccounts: TopAccountRow[];
  topProducts: TopProductRow[];
};

export function RevenuePerformanceTables({ topAccounts, topProducts }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card className="overflow-hidden">
        <div className="border-b border-border px-5 py-3">
          <h3 className="text-sm font-semibold">Top customers by MRR</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left">Customer</th>
              <th className="px-4 py-2 text-right">MRR</th>
              <th className="px-4 py-2 text-left">Renewal</th>
              <th className="px-4 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {topAccounts.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                  No active contracts yet.
                </td>
              </tr>
            ) : (
              topAccounts.map((row) => (
                <tr key={row.accountId} className="border-t border-border/40">
                  <td className="px-4 py-2 font-medium">{row.alias}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(row.mrr)}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {row.renewalDate
                      ? new Date(row.renewalDate).toLocaleDateString("en-KE", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "—"}
                  </td>
                  <td className="px-4 py-2">
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-500">
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-border px-5 py-3">
          <h3 className="text-sm font-semibold">Top performing products</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left">Product</th>
              <th className="px-4 py-2 text-right">Revenue</th>
              <th className="px-4 py-2 text-right">Margin</th>
            </tr>
          </thead>
          <tbody>
            {topProducts.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                  No paid revenue this month.
                </td>
              </tr>
            ) : (
              topProducts.map((row) => (
                <tr key={row.productId} className="border-t border-border/40">
                  <td className="px-4 py-2 font-medium">{row.name}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(row.revenue)}</td>
                  <td className="px-4 py-2 text-right text-muted-foreground">
                    {row.marginPct != null ? `${row.marginPct}%` : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
