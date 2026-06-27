import { db } from "@/lib/db";
import { DecisionStatus, Prisma, RiskCategory, RiskLevel } from "@prisma/client";

export const meetingRepository = {
  async list(skip: number, take: number) {
    const where = { deletedAt: null };
    const [items, total] = await Promise.all([
      db.meeting.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          creator: { select: { id: true, firstName: true, lastName: true } },
          customer: { select: { id: true, name: true } },
          actionItems: true,
        },
      }),
      db.meeting.count({ where }),
    ]);
    return { items, total };
  },

  async getById(id: string) {
    return db.meeting.findFirst({
      where: { id, deletedAt: null },
      include: {
        creator: true,
        customer: true,
        participants: { include: { user: true } },
        actionItems: true,
      },
    });
  },

  async create(data: {
    title: string;
    agenda?: string;
    minutes?: string;
    creatorId: string;
    customerId?: string;
    scheduledAt?: Date;
  }) {
    return db.meeting.create({
      data: { ...data, createdBy: data.creatorId },
      include: { actionItems: true },
    });
  },

  async update(id: string, data: Partial<{ title: string; agenda: string; minutes: string; transcript: string; aiSummary: string }>, userId: string) {
    return db.meeting.update({ where: { id }, data: { ...data, updatedBy: userId } });
  },

  async softDelete(id: string, userId: string) {
    return db.meeting.update({ where: { id }, data: { deletedAt: new Date(), updatedBy: userId } });
  },
};

export const decisionRepository = {
  async list(skip: number, take: number) {
    const where = { deletedAt: null };
    const [items, total] = await Promise.all([
      db.decision.findMany({ where, skip, take, orderBy: { createdAt: "desc" }, include: { owner: { select: { id: true, firstName: true, lastName: true } } } }),
      db.decision.count({ where }),
    ]);
    return { items, total };
  },

  async create(data: {
    title: string;
    context: string;
    alternatives?: string;
    decision: string;
    reasoning?: string;
    evidence?: string;
    ownerId?: string;
    reviewDate?: Date;
  }) {
    return db.decision.create({ data });
  },

  async update(
    id: string,
    data: Partial<{
      title: string;
      context: string;
      alternatives: string;
      decision: string;
      reasoning: string;
      outcome: string;
      status: DecisionStatus;
      reviewDate: Date | null;
    }>,
    userId: string
  ) {
    return db.decision.update({ where: { id }, data: { ...data, updatedBy: userId } });
  },

  async softDelete(id: string, userId: string) {
    return db.decision.update({ where: { id }, data: { deletedAt: new Date(), updatedBy: userId } });
  },
};

export const productRepository = {
  async list(skip: number, take: number) {
    const where = { deletedAt: null };
    const [items, total] = await Promise.all([
      db.product.findMany({ where, skip, take, orderBy: { name: "asc" }, include: { releases: { orderBy: { releasedAt: "desc" }, take: 3 } } }),
      db.product.count({ where }),
    ]);
    return { items, total };
  },

  async getById(id: string) {
    return db.product.findFirst({
      where: { id, deletedAt: null },
      include: { releases: { orderBy: { releasedAt: "desc" } }, ideas: true, research: true },
    });
  },

  async create(data: { name: string; slug: string; description?: string }) {
    return db.product.create({ data });
  },

  async update(id: string, data: Partial<{ name: string; description: string | null; status: string }>) {
    return db.product.update({ where: { id }, data });
  },

  async softDelete(id: string) {
    return db.product.update({ where: { id }, data: { deletedAt: new Date() } });
  },
};

export const revenueRepository = {
  async list(skip: number, take: number) {
    const where = { deletedAt: null };
    const [items, total] = await Promise.all([
      db.revenueEntry.findMany({ where, skip, take, orderBy: { recordedAt: "desc" }, include: { customer: true, product: true } }),
      db.revenueEntry.count({ where }),
    ]);
    return { items, total };
  },

  async create(data: Prisma.RevenueEntryCreateInput) {
    return db.revenueEntry.create({ data });
  },

  async getMrr() {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const entries = await db.revenueEntry.findMany({
      where: { deletedAt: null, type: "subscription", recordedAt: { gte: startOfMonth } },
    });
    return entries.reduce((sum, e) => sum + Number(e.amount), 0);
  },

  async getForecast() {
    const last6Months = await db.revenueEntry.groupBy({
      by: ["recordedAt"],
      where: { deletedAt: null, recordedAt: { gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) } },
      _sum: { amount: true },
    });
    const total = last6Months.reduce((s, m) => s + Number(m._sum.amount ?? 0), 0);
    const avg = total / 6;
    return { monthlyAverage: avg, projectedAnnual: avg * 12 };
  },
};

export const complianceRepository = {
  async list(skip: number, take: number) {
    const where = { deletedAt: null };
    const [items, total] = await Promise.all([
      db.complianceItem.findMany({ where, skip, take, orderBy: { deadline: "asc" } }),
      db.complianceItem.count({ where }),
    ]);
    return { items, total };
  },

  async create(data: Prisma.ComplianceItemCreateInput) {
    return db.complianceItem.create({ data });
  },

  async update(id: string, data: Prisma.ComplianceItemUpdateInput) {
    return db.complianceItem.update({ where: { id }, data });
  },

  async getDeadlines(days = 30) {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + days);
    return db.complianceItem.findMany({
      where: { deletedAt: null, deadline: { lte: deadline, gte: new Date() } },
      orderBy: { deadline: "asc" },
    });
  },

  async getScore() {
    const items = await db.complianceItem.findMany({ where: { deletedAt: null } });
    if (!items.length) return 100;
    const compliant = items.filter((i) => i.status === "COMPLIANT").length;
    return Math.round((compliant / items.length) * 100);
  },
};

export const riskRepository = {
  async list(skip: number, take: number, category?: RiskCategory) {
    const where = { deletedAt: null, ...(category && { category }) };
    const [items, total] = await Promise.all([
      db.risk.findMany({ where, skip, take, orderBy: [{ level: "desc" }, { createdAt: "desc" }] }),
      db.risk.count({ where }),
    ]);
    return { items, total };
  },

  async create(data: { title: string; description?: string; category: RiskCategory; level?: RiskLevel; mitigation?: string; ownerId?: string; reviewDate?: Date }) {
    return db.risk.create({ data });
  },

  async update(id: string, data: Partial<{ title: string; description: string; level: RiskLevel; mitigation: string; reviewDate: Date }>) {
    return db.risk.update({ where: { id }, data });
  },
};

export const competitorRepository = {
  async list() {
    return db.competitor.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } });
  },

  async create(data: Prisma.CompetitorCreateInput) {
    return db.competitor.create({ data });
  },

  async update(id: string, data: Prisma.CompetitorUpdateInput) {
    return db.competitor.update({ where: { id }, data });
  },

  async softDelete(id: string) {
    return db.competitor.update({ where: { id }, data: { deletedAt: new Date() } });
  },
};

export const apiRegistryRepository = {
  async list() {
    return db.apiRegistryEntry.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } });
  },

  async create(data: Prisma.ApiRegistryEntryCreateInput) {
    return db.apiRegistryEntry.create({ data });
  },

  async update(id: string, data: Prisma.ApiRegistryEntryUpdateInput) {
    return db.apiRegistryEntry.update({ where: { id }, data });
  },
};
