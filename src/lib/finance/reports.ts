import type { Decimal } from "@prisma/client/runtime/library";
import { ContractStatus, CustomerStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { RECURRING_REVENUE_TYPES } from "./constants";
import { accountDisplayLabel, maskInvoiceRef } from "./redaction";

const PAID = "paid";
const ACTIVE_CONTRACTS: ContractStatus[] = [ContractStatus.ACTIVE, ContractStatus.EXPIRING];
const OPEN_DEAL_STAGES = ["lead", "qualified", "proposal", "negotiation"];

function toAmount(value: Decimal | number | null | undefined): number {
  if (value == null) return 0;
  return Number(value);
}

function contractMrr(mrr: Decimal | null | undefined, value: Decimal | null | undefined): number {
  const m = toAmount(mrr);
  if (m > 0) return m;
  return toAmount(value);
}

function monthStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function monthEnd(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sept",
  "Oct",
  "Nov",
  "Dec",
] as const;

function formatMonthLabel(d: Date, withYear = false): string {
  const label = MONTH_LABELS[d.getMonth()] ?? "—";
  return withYear ? `${label} ${String(d.getFullYear()).slice(-2)}` : label;
}

function monthBucketKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}`;
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function customerAlias(
  customer: { name: string; alias: { alias: string } | null },
  canRevealPii: boolean
): string {
  const alias = customer.alias?.alias ?? "CUSTOMER";
  return accountDisplayLabel(alias, customer.name, canRevealPii);
}

export type RevenueCenterSnapshot = {
  executive: ExecutiveSummary;
  highlights: RevenueHighlights;
  trend: RevenueTrendPoint[];
  bySource: RevenueBySourceSlice[];
  revenueVsExpenses: RevenueVsExpensesPoint[];
  topAccounts: TopAccountRow[];
  topProducts: TopProductRow[];
  ledger: LedgerRow[];
  forecast: ForecastSummary;
};

export type ExecutiveSummary = {
  mrr: number;
  mrrChangePct: number | null;
  arr: number;
  revenueThisMonth: number;
  revenueChangePct: number | null;
  oneTimeRevenue: number;
  supportRevenue: number;
  grossRevenue: number;
  forecastNextMonth: number;
  profitMarginPct: number | null;
  netProfit: number;
  runwayMonths: number | null;
  cashAvailable: number | null;
  activeAccountCount: number;
  customerChange: number;
};

export type RevenueHighlights = {
  topProduct: { name: string; sharePct: number } | null;
  fastestGrowing: { name: string; growthPct: number } | null;
  highestChurnRisk: { label: string; count: number } | null;
  largestCustomer: { alias: string; mrr: number } | null;
};

export type RevenueTrendPoint = {
  month: string;
  revenue: number;
  mrr: number;
};

export type RevenueBySourceSlice = {
  type: string;
  label: string;
  amount: number;
  sharePct: number;
};

export type RevenueVsExpensesPoint = {
  month: string;
  revenue: number;
  expenses: number;
  net: number;
};

export type TopAccountRow = {
  accountId: string;
  alias: string;
  mrr: number;
  growthPct: number | null;
  renewalDate: string | null;
  status: string;
};

export type TopProductRow = {
  productId: string;
  name: string;
  revenue: number;
  marginPct: number | null;
};

export type LedgerRow = {
  id: string;
  date: string;
  alias: string;
  productName: string;
  revenueType: string;
  amount: number;
  isRecurring: boolean;
  contractId: string | null;
  status: string;
  invoiceRef: string | null;
};

export type ForecastSummary = {
  expectedNextMonth: number;
  confidencePct: number;
  risks: { title: string; detail: string; amount?: number }[];
  scenarios: { title: string; detail: string }[];
};

export async function getRevenueCenterSnapshot(
  canRevealPii: boolean,
  now = new Date()
): Promise<RevenueCenterSnapshot> {
  const thisMonthStart = monthStart(now);
  const thisMonthEnd = monthEnd(now);
  const lastMonthStart = monthStart(addMonths(now, -1));
  const lastMonthEnd = monthEnd(addMonths(now, -1));
  const yearAgo = addMonths(now, -11);

  const revenueWhere = { deletedAt: null, status: PAID };

  const [
    activeContracts,
    paidThisMonth,
    paidLastMonth,
    expensesThisMonthAgg,
    expensesLast3Avg,
    latestCash,
    recentEntries,
    allPaidLast12,
    openDeals,
    expiringContracts,
    accountsActive,
    accountsLastMonth,
  ] = await Promise.all([
    db.customerContract.findMany({
      where: { isRetainer: false, status: { in: ACTIVE_CONTRACTS } },
      include: { customer: { include: { alias: true } }, product: true },
    }),
    db.revenueEntry.aggregate({
      where: {
        ...revenueWhere,
        recordedAt: { gte: thisMonthStart, lte: thisMonthEnd },
      },
      _sum: { amount: true },
    }),
    db.revenueEntry.aggregate({
      where: {
        ...revenueWhere,
        recordedAt: { gte: lastMonthStart, lte: lastMonthEnd },
      },
      _sum: { amount: true },
    }),
    db.expense.aggregate({
      where: {
        deletedAt: null,
        recordedAt: { gte: thisMonthStart, lte: thisMonthEnd },
      },
      _sum: { amount: true },
    }),
    db.expense.aggregate({
      where: {
        deletedAt: null,
        recordedAt: { gte: addMonths(now, -3) },
      },
      _sum: { amount: true },
      _count: true,
    }),
    db.cashSnapshot.findFirst({ orderBy: { asOfDate: "desc" } }),
    db.revenueEntry.findMany({
      where: { deletedAt: null },
      orderBy: { recordedAt: "desc" },
      take: 25,
      include: {
        customer: { include: { alias: true } },
        product: true,
        contract: true,
      },
    }),
    db.revenueEntry.findMany({
      where: {
        ...revenueWhere,
        recordedAt: { gte: yearAgo },
      },
      include: { product: true, customer: { include: { alias: true } } },
    }),
    db.salesDeal.findMany({
      where: { deletedAt: null, stage: { in: OPEN_DEAL_STAGES } },
      include: { customer: { include: { alias: true } }, product: true },
    }),
    db.customerContract.findMany({
      where: {
        isRetainer: false,
        status: { in: ACTIVE_CONTRACTS },
        endDate: {
          gte: now,
          lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        },
        autoRenew: false,
      },
      include: { customer: { include: { alias: true } }, product: true },
    }),
    db.customer.count({
      where: { deletedAt: null, status: CustomerStatus.ACTIVE },
    }),
    db.customer.count({
      where: {
        deletedAt: null,
        status: CustomerStatus.ACTIVE,
        createdAt: { lt: thisMonthStart },
      },
    }),
  ]);

  const mrr = activeContracts.reduce((s, c) => s + contractMrr(c.mrr, c.value), 0);
  const revenueThisMonth = toAmount(paidThisMonth._sum.amount);
  const revenueLastMonth = toAmount(paidLastMonth._sum.amount);
  const expensesThisMonth = toAmount(expensesThisMonthAgg._sum.amount);
  const netProfit = revenueThisMonth - expensesThisMonth;
  const profitMarginPct =
    revenueThisMonth > 0 ? Math.round((netProfit / revenueThisMonth) * 1000) / 10 : null;

  const paidEntriesThisMonth = await db.revenueEntry.findMany({
    where: {
      ...revenueWhere,
      recordedAt: { gte: thisMonthStart, lte: thisMonthEnd },
    },
  });

  let oneTimeRevenue = 0;
  let supportRevenue = 0;
  for (const e of paidEntriesThisMonth) {
    if (RECURRING_REVENUE_TYPES.includes(e.type)) {
      if (e.type === "maintenance" || e.type === "support") {
        supportRevenue += toAmount(e.amount);
      }
    } else {
      oneTimeRevenue += toAmount(e.amount);
    }
  }

  const trailingExpenseAvg =
    expensesLast3Avg._count > 0
      ? Math.round(toAmount(expensesLast3Avg._sum.amount) / 3)
      : 0;
  const cashAvailable = latestCash ? toAmount(latestCash.balance) : null;
  const runwayMonths =
    cashAvailable != null && trailingExpenseAvg > 0
      ? Math.round((cashAvailable / trailingExpenseAvg) * 10) / 10
      : null;

  const pipelineNextMonth = openDeals
    .filter((d) => {
      if (!d.expectedCloseDate) return false;
      const close = d.expectedCloseDate;
      const nextStart = addMonths(now, 1);
      const nextEnd = monthEnd(nextStart);
      return close >= nextStart && close <= nextEnd;
    })
    .reduce(
      (s, d) =>
        s + Math.round((toAmount(d.expectedValue) * d.probabilityPercent) / 100),
      0
    );

  const churnRisk = expiringContracts.reduce(
    (s, c) => s + contractMrr(c.mrr, c.value),
    0
  );
  const forecastNextMonth = Math.max(0, mrr + pipelineNextMonth - churnRisk);

  const executive: ExecutiveSummary = {
    mrr,
    mrrChangePct: null,
    arr: mrr * 12,
    revenueThisMonth,
    revenueChangePct: pctChange(revenueThisMonth, revenueLastMonth),
    oneTimeRevenue,
    supportRevenue,
    grossRevenue: revenueThisMonth,
    forecastNextMonth,
    profitMarginPct,
    netProfit,
    runwayMonths,
    cashAvailable,
    activeAccountCount: accountsActive,
    customerChange: accountsActive - accountsLastMonth,
  };

  const highlights = buildHighlights(
    allPaidLast12,
    activeContracts,
    expiringContracts,
    thisMonthStart,
    lastMonthStart,
    canRevealPii
  );

  const [trend, bySource, revenueVsExpenses, topProducts] = await Promise.all([
    buildTrend(now),
    buildBySource(thisMonthStart, thisMonthEnd),
    buildRevenueVsExpenses(now),
    buildTopProducts(thisMonthStart, thisMonthEnd, expensesThisMonth, revenueThisMonth),
  ]);
  const topAccounts = buildTopAccounts(activeContracts, canRevealPii);

  const ledger: LedgerRow[] = recentEntries.map((e) => ({
    id: e.id,
    date: e.recordedAt.toISOString(),
    alias: e.customer
      ? customerAlias(e.customer, canRevealPii)
      : "Unassigned",
    productName: e.product?.name ?? "—",
    revenueType: e.type,
    amount: toAmount(e.amount),
    isRecurring: e.isRecurring,
    contractId: e.contractId,
    status: e.status,
    invoiceRef: maskInvoiceRef(e.invoiceRef, canRevealPii),
  }));

  const forecast = buildForecast(
    mrr,
    forecastNextMonth,
    pipelineNextMonth,
    expiringContracts,
    openDeals,
    activeContracts.length,
    allPaidLast12.length,
    canRevealPii
  );

  return {
    executive,
    highlights,
    trend,
    bySource,
    revenueVsExpenses,
    topAccounts,
    topProducts,
    ledger,
    forecast,
  };
}

function buildHighlights(
  paidLast12: {
    amount: Decimal;
    product: { name: string } | null;
    recordedAt: Date;
  }[],
  contracts: {
    mrr: Decimal | null;
    value: Decimal | null;
    customer: { name: string; alias: { alias: string } | null };
  }[],
  expiring: unknown[],
  thisMonthStart: Date,
  lastMonthStart: Date,
  canRevealPii: boolean
): RevenueHighlights {
  const byProduct = new Map<string, number>();
  const byProductThis = new Map<string, number>();
  const byProductLast = new Map<string, number>();

  for (const e of paidLast12) {
    const name = e.product?.name ?? "Other";
    const amt = toAmount(e.amount);
    byProduct.set(name, (byProduct.get(name) ?? 0) + amt);
    if (e.recordedAt >= thisMonthStart) {
      byProductThis.set(name, (byProductThis.get(name) ?? 0) + amt);
    } else if (e.recordedAt >= lastMonthStart && e.recordedAt < thisMonthStart) {
      byProductLast.set(name, (byProductLast.get(name) ?? 0) + amt);
    }
  }

  const total = [...byProduct.values()].reduce((a, b) => a + b, 0);
  let topProduct: RevenueHighlights["topProduct"] = null;
  if (total > 0) {
    const sorted = [...byProduct.entries()].sort((a, b) => b[1] - a[1]);
    const [name, amt] = sorted[0]!;
    topProduct = { name, sharePct: Math.round((amt / total) * 100) };
  }

  let fastestGrowing: RevenueHighlights["fastestGrowing"] = null;
  let bestGrowth = -Infinity;
  for (const [name, cur] of byProductThis) {
    const prev = byProductLast.get(name) ?? 0;
    const g = pctChange(cur, prev);
    if (g != null && g > bestGrowth) {
      bestGrowth = g;
      fastestGrowing = { name, growthPct: g };
    }
  }

  const largest = [...contracts].sort(
    (a, b) => contractMrr(b.mrr, b.value) - contractMrr(a.mrr, a.value)
  )[0];

  return {
    topProduct,
    fastestGrowing,
    highestChurnRisk:
      expiring.length > 0
        ? { label: "Contracts expiring (30d)", count: expiring.length }
        : null,
    largestCustomer: largest
      ? {
          alias: customerAlias(largest.customer, canRevealPii),
          mrr: contractMrr(largest.mrr, largest.value),
        }
      : null,
  };
}

async function buildTrend(now: Date): Promise<RevenueTrendPoint[]> {
  const trendStart = monthStart(addMonths(now, -11));
  const trendEnd = monthEnd(now);

  const [revenueEntries, contracts] = await Promise.all([
    db.revenueEntry.findMany({
      where: {
        deletedAt: null,
        status: PAID,
        recordedAt: { gte: trendStart, lte: trendEnd },
      },
      select: { amount: true, recordedAt: true },
    }),
    db.customerContract.findMany({
      where: {
        isRetainer: false,
        status: { in: ACTIVE_CONTRACTS },
      },
      select: { mrr: true, value: true, startDate: true },
    }),
  ]);

  const revenueByMonth = new Map<string, number>();
  for (const entry of revenueEntries) {
    const key = monthBucketKey(entry.recordedAt);
    revenueByMonth.set(key, (revenueByMonth.get(key) ?? 0) + toAmount(entry.amount));
  }

  const points: RevenueTrendPoint[] = [];
  for (let i = 11; i >= 0; i--) {
    const m = addMonths(now, -i);
    const start = monthStart(m);
    const end = monthEnd(m);
    const mrrSum = contracts
      .filter((c) => c.startDate <= end)
      .reduce((s, c) => s + contractMrr(c.mrr, c.value), 0);
    points.push({
      month: formatMonthLabel(start, true),
      revenue: revenueByMonth.get(monthBucketKey(start)) ?? 0,
      mrr: mrrSum,
    });
  }
  return points;
}

async function buildBySource(start: Date, end: Date): Promise<RevenueBySourceSlice[]> {
  const rows = await db.revenueEntry.groupBy({
    by: ["type"],
    where: {
      deletedAt: null,
      status: PAID,
      recordedAt: { gte: start, lte: end },
    },
    _sum: { amount: true },
  });
  const total = rows.reduce((s, r) => s + toAmount(r._sum.amount), 0);
  const { REVENUE_TYPE_LABELS } = await import("./constants");
  return rows
    .map((r) => ({
      type: r.type,
      label: REVENUE_TYPE_LABELS[r.type] ?? r.type,
      amount: toAmount(r._sum.amount),
      sharePct: total > 0 ? Math.round((toAmount(r._sum.amount) / total) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

async function buildRevenueVsExpenses(now: Date): Promise<RevenueVsExpensesPoint[]> {
  const windowStart = monthStart(addMonths(now, -5));
  const windowEnd = monthEnd(now);

  const [revenueEntries, expenseEntries] = await Promise.all([
    db.revenueEntry.findMany({
      where: {
        deletedAt: null,
        status: PAID,
        recordedAt: { gte: windowStart, lte: windowEnd },
      },
      select: { amount: true, recordedAt: true },
    }),
    db.expense.findMany({
      where: {
        deletedAt: null,
        recordedAt: { gte: windowStart, lte: windowEnd },
      },
      select: { amount: true, recordedAt: true },
    }),
  ]);

  const revenueByMonth = new Map<string, number>();
  for (const entry of revenueEntries) {
    const key = monthBucketKey(entry.recordedAt);
    revenueByMonth.set(key, (revenueByMonth.get(key) ?? 0) + toAmount(entry.amount));
  }

  const expensesByMonth = new Map<string, number>();
  for (const entry of expenseEntries) {
    const key = monthBucketKey(entry.recordedAt);
    expensesByMonth.set(key, (expensesByMonth.get(key) ?? 0) + toAmount(entry.amount));
  }

  const points: RevenueVsExpensesPoint[] = [];
  for (let i = 5; i >= 0; i--) {
    const m = addMonths(now, -i);
    const start = monthStart(m);
    const key = monthBucketKey(start);
    const revenue = revenueByMonth.get(key) ?? 0;
    const expenses = expensesByMonth.get(key) ?? 0;
    points.push({
      month: formatMonthLabel(start),
      revenue,
      expenses,
      net: revenue - expenses,
    });
  }
  return points;
}

function buildTopAccounts(
  contracts: {
    mrr: Decimal | null;
    value: Decimal | null;
    endDate: Date;
    status: ContractStatus;
    customer: { id: string; name: string; alias: { alias: string } | null };
  }[],
  canRevealPii: boolean
): TopAccountRow[] {
  const byAccount = new Map<
    string,
    { alias: string; mrr: number; renewalDate: Date; status: string }
  >();
  for (const c of contracts) {
    const cur = byAccount.get(c.customer.id);
    const alias = customerAlias(c.customer, canRevealPii);
    const mrr = contractMrr(c.mrr, c.value);
    if (!cur) {
      byAccount.set(c.customer.id, {
        alias,
        mrr,
        renewalDate: c.endDate,
        status: c.status,
      });
    } else {
      cur.mrr += mrr;
    }
  }
  return [...byAccount.entries()]
    .map(([accountId, v]) => ({
      accountId,
      alias: v.alias,
      mrr: v.mrr,
      growthPct: null,
      renewalDate: v.renewalDate.toISOString(),
      status: v.status,
    }))
    .sort((a, b) => b.mrr - a.mrr)
    .slice(0, 10);
}

async function buildTopProducts(
  start: Date,
  end: Date,
  expenses: number,
  revenue: number
): Promise<TopProductRow[]> {
  const rows = await db.revenueEntry.groupBy({
    by: ["productId"],
    where: {
      deletedAt: null,
      status: PAID,
      recordedAt: { gte: start, lte: end },
      productId: { not: null },
    },
    _sum: { amount: true },
  });
  const products = await db.product.findMany({
    where: { id: { in: rows.map((r) => r.productId!).filter(Boolean) } },
  });
  const nameById = new Map(products.map((p) => [p.id, p.name]));
  const marginPct =
    revenue > 0 ? Math.round(((revenue - expenses) / revenue) * 100) : null;

  return rows
    .map((r) => ({
      productId: r.productId!,
      name: nameById.get(r.productId!) ?? "Unknown",
      revenue: toAmount(r._sum.amount),
      marginPct,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);
}

function buildForecast(
  mrr: number,
  expectedNextMonth: number,
  pipelineNextMonth: number,
  expiringContracts: {
    mrr: Decimal | null;
    value: Decimal | null;
    customer: { name: string; alias: { alias: string } | null };
    product: { name: string } | null;
  }[],
  openDeals: { customer: { name: string; alias: { alias: string } | null } }[],
  contractCount: number,
  paidEntryCount: number,
  canRevealPii: boolean
): ForecastSummary {
  const risks: ForecastSummary["risks"] = [];
  if (expiringContracts.length > 0) {
    const loss = expiringContracts.reduce(
      (s, c) => s + contractMrr(c.mrr, c.value),
      0
    );
    risks.push({
      title: `${expiringContracts.length} contract(s) expire within 30 days`,
      detail: expiringContracts
        .map(
          (c) =>
            `${customerAlias(c.customer, canRevealPii)} — ${c.product?.name ?? "Contract"}`
        )
        .join(", "),
      amount: loss,
    });
  }

  if (openDeals.length === 0 && contractCount === 0 && paidEntryCount === 0) {
    risks.push({
      title: "Insufficient data",
      detail: "Add contracts and paid revenue entries to improve forecast confidence.",
    });
  }

  const scenarios: ForecastSummary["scenarios"] = [];
  if (pipelineNextMonth > 0) {
    scenarios.push({
      title: "Pipeline closes on schedule",
      detail: `Weighted pipeline adds ${Math.round(pipelineNextMonth).toLocaleString()} KES next month.`,
    });
  }
  if (mrr > 0) {
    scenarios.push({
      title: "All contracts renew",
      detail: `MRR base remains ${Math.round(mrr).toLocaleString()} KES/month.`,
    });
  }

  let confidencePct = 40;
  if (contractCount > 0) confidencePct += 25;
  if (paidEntryCount >= 6) confidencePct += 20;
  if (pipelineNextMonth > 0) confidencePct += 10;
  confidencePct = Math.min(95, confidencePct);

  return {
    expectedNextMonth,
    confidencePct,
    risks,
    scenarios,
  };
}

export async function getRevenueFactsForAgent(): Promise<string> {
  const snap = await getRevenueCenterSnapshot(false);
  const e = snap.executive;
  const lines = [
    `MRR (KES): ${Math.round(e.mrr).toLocaleString()}`,
    `Revenue this month (KES): ${Math.round(e.revenueThisMonth).toLocaleString()}`,
    `Net profit this month (KES): ${Math.round(e.netProfit).toLocaleString()}`,
    `Active customers: ${e.activeAccountCount}`,
    `Forecast next month (KES): ${Math.round(e.forecastNextMonth).toLocaleString()}`,
    `Contracts expiring (30d): ${snap.forecast.risks.filter((r) => r.amount).length}`,
  ];
  if (snap.highlights.topProduct) {
    lines.push(
      `Top product: ${snap.highlights.topProduct.name} (${snap.highlights.topProduct.sharePct}%)`
    );
  }
  return lines.join("\n");
}

export async function getRevenueByIndustry(
  start: Date,
  end: Date
): Promise<{ industry: string; amount: number }[]> {
  const entries = await db.revenueEntry.findMany({
    where: {
      deletedAt: null,
      status: PAID,
      recordedAt: { gte: start, lte: end },
    },
    include: { customer: { select: { industry: true } } },
  });
  const map = new Map<string, number>();
  for (const e of entries) {
    const ind = e.customer?.industry?.trim() || "Unspecified";
    map.set(ind, (map.get(ind) ?? 0) + toAmount(e.amount));
  }
  return [...map.entries()]
    .map(([industry, amount]) => ({ industry, amount }))
    .sort((a, b) => b.amount - a.amount);
}

export async function getRevenueByAcquisitionSource(
  start: Date,
  end: Date
): Promise<{ source: string; amount: number }[]> {
  const entries = await db.revenueEntry.findMany({
    where: {
      deletedAt: null,
      status: PAID,
      recordedAt: { gte: start, lte: end },
    },
    include: { customer: { select: { acquisitionSource: true } } },
  });
  const map = new Map<string, number>();
  const { ACQUISITION_SOURCE_LABELS } = await import("./constants");
  for (const e of entries) {
    const src = e.customer?.acquisitionSource
      ? ACQUISITION_SOURCE_LABELS[e.customer.acquisitionSource] ?? e.customer.acquisitionSource
      : "Unspecified";
    map.set(src, (map.get(src) ?? 0) + toAmount(e.amount));
  }
  return [...map.entries()]
    .map(([source, amount]) => ({ source, amount }))
    .sort((a, b) => b.amount - a.amount);
}
