"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  Users,
  DollarSign,
  ShieldAlert,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { AiBriefCard } from "@/components/dashboard/ai-brief-card";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { formatCurrency } from "@/lib/utils";

interface DashboardData {
  kpis: {
    knowledgeArticles: number;
    customers: number;
    totalRevenue: number;
    mrr: number;
    complianceIssues: number;
    highRisks: number;
  };
  aiBrief: string;
  recentMeetings: Array<{ id: string; title: string; scheduledAt?: string; aiSummary?: string }>;
  recentJournal: Array<{ id: string; date: string; content: string; aiSummary?: string }>;
}

export function ExecutiveDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/dashboard")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setData(json.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Executive Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          What matters most for the business right now.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard
          title="Knowledge"
          value={loading ? "—" : data?.kpis.knowledgeArticles ?? 0}
          icon={BookOpen}
        />
        <MetricCard
          title="Customers"
          value={loading ? "—" : data?.kpis.customers ?? 0}
          icon={Users}
        />
        <MetricCard
          title="MRR"
          value={loading ? "—" : formatCurrency(data?.kpis.mrr ?? 0)}
          icon={TrendingUp}
          accent="revenue"
        />
        <MetricCard
          title="Revenue"
          value={loading ? "—" : formatCurrency(data?.kpis.totalRevenue ?? 0)}
          icon={DollarSign}
          accent="revenue"
        />
        <MetricCard
          title="Compliance"
          value={loading ? "—" : data?.kpis.complianceIssues ?? 0}
          icon={ShieldAlert}
          accent="warning"
        />
        <MetricCard
          title="High Risks"
          value={loading ? "—" : data?.kpis.highRisks ?? 0}
          icon={AlertTriangle}
          accent="error"
        />
      </div>

      <AiBriefCard brief={data?.aiBrief} loading={loading} />

      <div className="grid gap-4 lg:grid-cols-2">
        <RecentActivity
          title="Recent Meetings"
          loading={loading}
          items={data?.recentMeetings.map((m) => ({
            id: m.id,
            title: m.title,
            subtitle: m.aiSummary,
            date: m.scheduledAt,
          }))}
          emptyMessage="No meetings recorded yet."
        />
        <RecentActivity
          title="Founder Journal"
          loading={loading}
          items={data?.recentJournal.map((j) => ({
            id: j.id,
            title: new Date(j.date).toLocaleDateString(),
            subtitle: j.aiSummary ?? j.content,
            date: j.date,
          }))}
          emptyMessage="No journal entries yet."
        />
      </div>
    </div>
  );
}
