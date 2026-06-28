import { db } from "@/lib/db";
import { getDeepSeekApiKey } from "@/lib/ai/deepseek";
import { Prisma, ResearchStage } from "@prisma/client";

export const dashboardRepository = {
  async getOverview(userId: string) {
    const now = new Date();
    const [
      articleCount,
      customerCount,
      revenueAgg,
      complianceAtRisk,
      openRisks,
      recentMeetings,
      upcomingMeetings,
      meetingReminders,
      decisionReminders,
      decisionsDueForReview,
      recentJournal,
      notifications,
    ] = await Promise.all([
      db.knowledgeArticle.count({ where: { deletedAt: null, status: "PUBLISHED" } }),
      db.customer.count({ where: { deletedAt: null } }),
      db.revenueEntry.aggregate({ where: { deletedAt: null }, _sum: { amount: true } }),
      db.complianceItem.count({ where: { deletedAt: null, status: { in: ["AT_RISK", "NON_COMPLIANT"] } } }),
      db.risk.count({ where: { deletedAt: null, level: { in: ["HIGH", "CRITICAL"] } } }),
      db.meeting.findMany({
        where: { deletedAt: null, status: "COMPLETED" },
        take: 5,
        orderBy: { scheduledAt: "desc" },
        select: {
          id: true,
          title: true,
          scheduledAt: true,
          aiSummary: true,
          outcome: true,
          type: true,
          meetingUrl: true,
        },
      }),
      db.meeting.findMany({
        where: {
          deletedAt: null,
          status: "SCHEDULED",
          scheduledAt: { gte: now },
        },
        take: 5,
        orderBy: { scheduledAt: "asc" },
        select: {
          id: true,
          title: true,
          scheduledAt: true,
          endsAt: true,
          type: true,
          meetingUrl: true,
          location: true,
          customer: { select: { id: true, name: true } },
        },
      }),
      db.reminder.findMany({
        where: {
          deletedAt: null,
          completed: false,
          userId,
          meetingId: { not: null },
          dueAt: { gte: now },
        },
        take: 5,
        orderBy: { dueAt: "asc" },
        select: {
          id: true,
          title: true,
          dueAt: true,
          meetingId: true,
          meeting: { select: { id: true, title: true, scheduledAt: true, meetingUrl: true } },
        },
      }),
      db.reminder.findMany({
        where: {
          deletedAt: null,
          completed: false,
          userId,
          decisionId: { not: null },
        },
        take: 5,
        orderBy: { dueAt: "asc" },
        select: {
          id: true,
          title: true,
          dueAt: true,
          decisionId: true,
          decision: {
            select: {
              id: true,
              title: true,
              reviewDate: true,
              status: true,
            },
          },
        },
      }),
      db.decision.findMany({
        where: {
          deletedAt: null,
          reviewDate: { lte: now },
          status: { notIn: ["REVIEWED", "SUPERSEDED"] },
        },
        take: 5,
        orderBy: { reviewDate: "asc" },
        select: {
          id: true,
          title: true,
          reviewDate: true,
          status: true,
          owner: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      db.journalEntry.findMany({
        where: { deletedAt: null },
        take: 5,
        orderBy: { date: "desc" },
        select: { id: true, date: true, content: true, aiSummary: true },
      }),
      db.notification.findMany({
        where: { userId, read: false },
        take: 10,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const mrrEntries = await db.revenueEntry.findMany({
      where: { deletedAt: null, type: "subscription", recordedAt: { gte: new Date(new Date().setDate(1)) } },
    });
    const mrr = mrrEntries.reduce((sum, e) => sum + Number(e.amount), 0);
    const totalRevenue = Number(revenueAgg._sum.amount ?? 0);

    const kpis = {
      knowledgeArticles: articleCount,
      customers: customerCount,
      totalRevenue,
      mrr,
      complianceIssues: complianceAtRisk,
      highRisks: openRisks,
    };

    let aiBrief = buildFounderBrief(kpis, decisionsDueForReview.length);
    const deepseekKey = await getDeepSeekApiKey();
    if (deepseekKey) {
      try {
        const { aiService } = await import("@/server/ai/ai.service");
        const result = await aiService.founderBrief();
        if (result.response && !result.response.startsWith("[AI Offline]")) {
          aiBrief = result.response;
        }
      } catch {
        // keep data-driven brief on AI failure
      }
    }

    return {
      kpis,
      recentMeetings,
      upcomingMeetings,
      meetingReminders,
      decisionReminders,
      decisionsDueForReview,
      recentJournal,
      notifications,
      aiBrief,
    };
  },
};

function buildFounderBrief(kpis: {
  knowledgeArticles: number;
  customers: number;
  totalRevenue: number;
  mrr: number;
  complianceIssues: number;
  highRisks: number;
}, decisionsDue = 0): string {
  const parts = [
    `${kpis.knowledgeArticles} knowledge article${kpis.knowledgeArticles === 1 ? "" : "s"} published.`,
    `${kpis.customers} active customer${kpis.customers === 1 ? "" : "s"}.`,
    `MRR at KES ${kpis.mrr.toLocaleString()}.`,
  ];

  if (decisionsDue > 0) {
    parts.push(`${decisionsDue} decision${decisionsDue === 1 ? "" : "s"} due for review.`);
  }

  if (kpis.highRisks > 0) {
    parts.push(`${kpis.highRisks} high-risk item${kpis.highRisks === 1 ? "" : "s"} need review.`);
  } else {
    parts.push("No critical risks flagged.");
  }

  if (kpis.complianceIssues > 0) {
    parts.push(`${kpis.complianceIssues} compliance issue${kpis.complianceIssues === 1 ? "" : "s"} require attention.`);
  } else {
    parts.push("Compliance status is clear.");
  }

  return parts.join(" ");
}

export const customerRepository = {
  async list(skip: number, take: number, search?: string) {
    const where: Prisma.CustomerWhereInput = {
      deletedAt: null,
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { company: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      }),
    };
    const [items, total] = await Promise.all([
      db.customer.findMany({ where, skip, take, orderBy: { createdAt: "desc" }, include: {
        alias: true,
        products: { include: { product: true } },
        contracts: {
          where: { isRetainer: false, status: { in: ["ACTIVE", "EXPIRING", "DRAFT"] } },
          orderBy: { endDate: "asc" },
          take: 1,
        },
      } }),
      db.customer.count({ where }),
    ]);
    return { items, total };
  },

  async getById(id: string) {
    return db.customer.findFirst({
      where: { id, deletedAt: null },
      include: {
        alias: true,
        products: { include: { product: true } },
        feedback: { orderBy: { createdAt: "desc" } },
        meetings: { orderBy: { createdAt: "desc" } },
        revenue: { orderBy: { recordedAt: "desc" } },
        support: { orderBy: { createdAt: "desc" } },
        contracts: {
          where: { isRetainer: false },
          orderBy: { endDate: "desc" },
          include: { retainers: { orderBy: { createdAt: "asc" } } },
        },
      },
    });
  },

  async create(data: Prisma.CustomerCreateInput) {
    return db.customer.create({ data });
  },

  async update(id: string, data: Prisma.CustomerUpdateInput) {
    return db.customer.update({ where: { id }, data });
  },

  async softDelete(id: string) {
    return db.customer.update({ where: { id }, data: { deletedAt: new Date() } });
  },

  async getTimeline(id: string) {
    const [meetings, feedback, revenue, support] = await Promise.all([
      db.meeting.findMany({ where: { customerId: id, deletedAt: null }, orderBy: { createdAt: "desc" } }),
      db.customerFeedback.findMany({ where: { customerId: id }, orderBy: { createdAt: "desc" } }),
      db.revenueEntry.findMany({ where: { customerId: id, deletedAt: null }, orderBy: { recordedAt: "desc" } }),
      db.supportTicket.findMany({ where: { customerId: id, deletedAt: null }, orderBy: { createdAt: "desc" } }),
    ]);
    return { meetings, feedback, revenue, support };
  },

  async getOrCreateAlias(customerId: string, industry?: string | null) {
    const existing = await db.customerAlias.findUnique({ where: { customerId } });
    if (existing) return existing;
    const { generateDefaultAlias } = await import("@/lib/ai/pii-mask");
    return db.customerAlias.create({
      data: { customerId, alias: generateDefaultAlias(industry) },
    });
  },

  async upsertAlias(customerId: string, alias: string) {
    return db.customerAlias.upsert({
      where: { customerId },
      create: { customerId, alias },
      update: { alias },
    });
  },

  async updateAiAnalysis(id: string, aiAnalysis: unknown) {
    return db.customer.update({ where: { id }, data: { aiAnalysis: aiAnalysis as Prisma.InputJsonValue } });
  },

  async listForPortfolio() {
    return db.customer.findMany({
      where: { deletedAt: null },
      include: {
        alias: true,
        products: { include: { product: true } },
        revenue: { where: { deletedAt: null } },
        contracts: { where: { isRetainer: false, status: { in: ["ACTIVE", "EXPIRING"] } } },
      },
    });
  },
};

export const customerContractRepository = {
  async listByCustomer(customerId: string) {
    return db.customerContract.findMany({
      where: { customerId, isRetainer: false },
      orderBy: { endDate: "desc" },
      include: { retainers: { orderBy: { createdAt: "asc" } } },
    });
  },

  async create(
    customerId: string,
    data: Omit<Prisma.CustomerContractCreateInput, "customer">,
    userId?: string
  ) {
    return db.customerContract.create({
      data: {
        ...data,
        customer: { connect: { id: customerId } },
        createdBy: userId,
        updatedBy: userId,
      },
      include: { retainers: true },
    });
  },

  async update(id: string, data: Prisma.CustomerContractUpdateInput, userId?: string) {
    return db.customerContract.update({
      where: { id },
      data: { ...data, updatedBy: userId },
      include: { retainers: true },
    });
  },

  async getById(id: string) {
    return db.customerContract.findUnique({
      where: { id },
      include: { retainers: true, customer: { include: { alias: true } } },
    });
  },
};

export const contractSettingsRepository = {
  key: "contract_template_settings",

  async get() {
    const { DEFAULT_CONTRACT_SETTINGS } = await import("@/types/customer");
    const { resolvePdfFont } = await import("@/lib/contracts/markdown-to-pdf-blocks");
    const setting = await db.systemSetting.findUnique({ where: { key: this.key } });
    if (!setting?.value) return DEFAULT_CONTRACT_SETTINGS;
    const stored = setting.value as Record<string, unknown>;
    return {
      ...DEFAULT_CONTRACT_SETTINGS,
      ...stored,
      fontFamily: resolvePdfFont(String(stored.fontFamily ?? DEFAULT_CONTRACT_SETTINGS.fontFamily)),
    };
  },

  async update(value: unknown, userId?: string) {
    const { resolvePdfFont } = await import("@/lib/contracts/markdown-to-pdf-blocks");
    const payload = value as Record<string, unknown>;
    const normalized = {
      ...payload,
      fontFamily: resolvePdfFont(String(payload.fontFamily ?? "helvetica")),
    };
    return db.systemSetting.upsert({
      where: { key: this.key },
      create: { key: this.key, value: normalized as Prisma.InputJsonValue, updatedBy: userId },
      update: { value: normalized as Prisma.InputJsonValue, updatedBy: userId },
    });
  },
};

export const journalRepository = {
  async getById(id: string) {
    return db.journalEntry.findFirst({
      where: { id, deletedAt: null },
      include: { author: { select: { firstName: true, lastName: true } } },
    });
  },

  async list(authorId: string | undefined, skip: number, take: number) {
    const where = { deletedAt: null, ...(authorId && { authorId }) };
    const [items, total] = await Promise.all([
      db.journalEntry.findMany({ where, skip, take, orderBy: { date: "desc" }, include: { author: { select: { firstName: true, lastName: true } } } }),
      db.journalEntry.count({ where }),
    ]);
    return { items, total };
  },

  async create(data: { authorId: string; content: string; lessons?: string; challenges?: string; wins?: string; mood?: string }) {
    return db.journalEntry.create({ data: { ...data, createdBy: data.authorId } });
  },

  async update(id: string, data: Partial<{ content: string; lessons: string; challenges: string; wins: string; mood: string; aiSummary: string }>, userId: string) {
    return db.journalEntry.update({ where: { id }, data: { ...data, updatedBy: userId } });
  },

  async softDelete(id: string, userId: string) {
    return db.journalEntry.update({ where: { id }, data: { deletedAt: new Date(), updatedBy: userId } });
  },
};

export const researchRepository = {
  async list(skip: number, take: number, stage?: ResearchStage) {
    const where = { deletedAt: null, ...(stage && { stage }) };
    const [items, total] = await Promise.all([
      db.researchTopic.findMany({ where, skip, take, orderBy: { updatedAt: "desc" }, include: { author: true, product: true, tags: { include: { tag: true } } } }),
      db.researchTopic.count({ where }),
    ]);
    return { items, total };
  },

  async create(data: {
    title: string;
    description?: string;
    authorId: string;
    productId?: string;
    stage?: ResearchStage;
    notes?: string;
    summary?: string;
    sourceChat?: Prisma.InputJsonValue;
    aiAnalysis?: Prisma.InputJsonValue;
  }) {
    return db.researchTopic.create({ data: { ...data, createdBy: data.authorId } });
  },

  async getById(id: string) {
    return db.researchTopic.findFirst({
      where: { id, deletedAt: null },
      include: { author: true, product: true, tags: { include: { tag: true } } },
    });
  },

  async update(
    id: string,
    data: Partial<{
      title: string;
      description: string | null;
      stage: ResearchStage;
      notes: string | null;
      summary: string | null;
      productId: string | null;
    }>,
    userId: string
  ) {
    return db.researchTopic.update({ where: { id }, data: { ...data, updatedBy: userId } });
  },

  async softDelete(id: string, userId: string) {
    return db.researchTopic.update({ where: { id }, data: { deletedAt: new Date(), updatedBy: userId } });
  },
};
