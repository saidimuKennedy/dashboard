"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Bar,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
} from "recharts";
import type {
  RevenueBySourceSlice,
  RevenueTrendPoint,
  RevenueVsExpensesPoint,
} from "@/lib/finance/reports";
import { formatCurrency } from "@/lib/utils";
import { Card } from "@/components/ui/card";

const PIE_COLORS = ["#22c55e", "#3b82f6", "#a855f7", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899"];

type RevenueChartsProps = {
  trend: RevenueTrendPoint[];
  bySource: RevenueBySourceSlice[];
  revenueVsExpenses: RevenueVsExpensesPoint[];
};

export function RevenueCharts({ trend, bySource, revenueVsExpenses }: RevenueChartsProps) {
  const pieData = bySource.map((s) => ({
    name: s.label,
    value: s.amount,
  }));

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <Card className="rounded-2xl p-5 xl:col-span-2">
        <h3 className="mb-3 text-sm font-semibold">Revenue trend</h3>
        <div className="h-56">
          {trend.length === 0 ? (
            <p className="text-sm text-muted-foreground">No revenue history yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Legend />
                <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#22c55e" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="mrr" name="MRR" stroke="#3b82f6" strokeWidth={2} strokeDasharray="4 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <Card className="rounded-2xl p-5">
        <h3 className="mb-3 text-sm font-semibold">Revenue by source</h3>
        <div className="h-56">
          {pieData.length === 0 ? (
            <p className="text-sm text-muted-foreground">No paid revenue this month.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <Card className="rounded-2xl p-5 xl:col-span-3">
        <h3 className="mb-3 text-sm font-semibold">Revenue vs expenses</h3>
        <div className="h-56">
          {revenueVsExpenses.every((p) => p.revenue === 0 && p.expenses === 0) ? (
            <p className="text-sm text-muted-foreground">Add revenue and expense entries to see P&amp;L.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={revenueVsExpenses}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Legend />
                <Bar dataKey="revenue" name="Revenue" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="net" name="Net" stroke="#e2e8f0" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  );
}
