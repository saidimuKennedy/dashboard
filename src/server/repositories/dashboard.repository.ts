import { db } from "@/lib/db";
import { Prisma, ResearchStage } from "@prisma/client";

export const dashboardRepository = {
  async getOverview() {
    const [
      articleCount,
      customerCount,
      revenueAgg,
      complianceAtRisk,
      openRisks,
      recentMeetings,
      recentJournal,
      notifications,
    ] = await Promise.all([
      db.knowledgeArticle.count({ where: { deletedAt: null, status: "PUBLISHED" } }),
      db.customer.count({ where: { deletedAt: null } }),
      db.revenueEntry.aggregate({ where: { deletedAt: null }, _sum: { amount: true } }),
      db.complianceItem.count({ where: { deletedAt: null, status: { in: ["AT_RISK", "NON_COMPLIANT"] } } }),
      db.risk.count({ where: { deletedAt: null, level: { in: ["HIGH", "CRITICAL"] } } }),
      db.meeting.findMany({
        where: { deletedAt: null },
        take: 5,
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, scheduledAt: true, aiSummary: true },
      }),
      db.journalEntry.findMany({
        where: { deletedAt: null },
        take: 5,
        orderBy: { date: "desc" },
        select: { id: true, date: true, content: true, aiSummary: true },
      }),
      db.notification.findMany({
        where: { read: false },
        take: 10,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const mrrEntries = await db.revenueEntry.findMany({
      where: { deletedAt: null, type: "subscription", recordedAt: { gte: new Date(new Date().setDate(1)) } },
    });
    const mrr = mrrEntries.reduce((sum, e) => sum + Number(e.amount), 0);

    return {
      kpis: {
        knowledgeArticles: articleCount,
        customers: customerCount,
        totalRevenue: Number(revenueAgg._sum.amount ?? 0),
        mrr,
        complianceIssues: complianceAtRisk,
        highRisks: openRisks,
      },
      recentMeetings,
      recentJournal,
      notifications,
      aiBrief: "Welcome to JIP. Connect DeepSeek API key to enable AI briefings.",
    };
  },
};

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
      db.customer.findMany({ where, skip, take, orderBy: { createdAt: "desc" }, include: { products: { include: { product: true } } } }),
      db.customer.count({ where }),
    ]);
    return { items, total };
  },

  async getById(id: string) {
    return db.customer.findFirst({
      where: { id, deletedAt: null },
      include: {
        products: { include: { product: true } },
        feedback: { orderBy: { createdAt: "desc" } },
        meetings: { orderBy: { createdAt: "desc" } },
        revenue: { orderBy: { recordedAt: "desc" } },
        support: { orderBy: { createdAt: "desc" } },
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
};

export const journalRepository = {
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

  async create(data: { title: string; description?: string; authorId: string; productId?: string; stage?: ResearchStage }) {
    return db.researchTopic.create({ data: { ...data, createdBy: data.authorId } });
  },

  async update(
    id: string,
    data: Partial<{
      title: string;
      description: string;
      stage: ResearchStage;
      notes: string;
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
