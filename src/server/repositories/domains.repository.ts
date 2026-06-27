import { db } from "@/lib/db";
import { clearDecisionReminders, syncDecisionReviewReminders } from "@/lib/decisions/reminders";
import { assertStatusTransition } from "@/lib/decisions/status-transitions";
import { DecisionStatus, Prisma, RiskCategory, RiskLevel } from "@prisma/client";

export { InvalidStatusTransitionError } from "@/lib/decisions/status-transitions";
export { meetingRepository } from "@/server/repositories/meeting.repository";

const statusHistoryInclude = {
  orderBy: { createdAt: "desc" as const },
  include: {
    user: { select: { id: true, firstName: true, lastName: true } },
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

  async getById(id: string) {
    return db.decision.findFirst({
      where: { id, deletedAt: null },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true } },
        statusHistory: statusHistoryInclude,
      },
    });
  },

  async findSimilar(
    query: { title: string; context: string; decision: string },
    excludeId?: string,
    limit = 5
  ) {
    const terms = [query.title, query.context, query.decision]
      .join(" ")
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .slice(0, 8);

    const orConditions = terms.flatMap((term) => [
      { title: { contains: term, mode: "insensitive" as const } },
      { context: { contains: term, mode: "insensitive" as const } },
      { decision: { contains: term, mode: "insensitive" as const } },
      { reasoning: { contains: term, mode: "insensitive" as const } },
    ]);

    return db.decision.findMany({
      where: {
        deletedAt: null,
        ...(excludeId ? { id: { not: excludeId } } : {}),
        ...(orConditions.length ? { OR: orConditions } : {}),
      },
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        decision: true,
        status: true,
        outcome: true,
        createdAt: true,
      },
    });
  },

  async create(
    data: {
      title: string;
      context: string;
      alternatives?: string;
      decision: string;
      reasoning?: string;
      evidence?: string;
      ownerId?: string;
      reviewDate?: Date;
      status?: DecisionStatus;
    },
    userId: string
  ) {
    const status = data.status ?? "PROPOSED";

    const created = await db.$transaction(async (tx) => {
      const decision = await tx.decision.create({
        data: {
          ...data,
          status,
          createdBy: userId,
          updatedBy: userId,
        },
      });

      await tx.decisionStatusHistory.create({
        data: {
          decisionId: decision.id,
          fromStatus: null,
          toStatus: status,
          changedBy: userId,
          note: "Decision logged",
        },
      });

      return decision;
    });

    await syncDecisionReviewReminders(
      created.id,
      userId,
      created.title,
      created.reviewDate,
      created.status
    );

    return decisionRepository.getById(created.id);
  },

  async update(
    id: string,
    data: Partial<{
      title: string;
      context: string;
      alternatives: string | null;
      decision: string;
      reasoning: string | null;
      outcome: string | null;
      evidence: string | null;
      status: DecisionStatus;
      reviewDate: Date | null;
    }>,
    userId: string
  ) {
    const existing = await db.decision.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return null;

    if (data.status && data.status !== existing.status) {
      assertStatusTransition(existing.status, data.status);
    }

    const nextStatus = data.status ?? existing.status;
    const nextReviewDate = data.reviewDate !== undefined ? data.reviewDate : existing.reviewDate;
    const statusChanged = data.status !== undefined && data.status !== existing.status;
    const reviewDateChanged =
      data.reviewDate !== undefined &&
      (existing.reviewDate?.getTime() ?? null) !== (data.reviewDate?.getTime() ?? null);

    await db.$transaction(async (tx) => {
      await tx.decision.update({
        where: { id },
        data: { ...data, updatedBy: userId },
      });

      if (statusChanged && data.status) {
        await tx.decisionStatusHistory.create({
          data: {
            decisionId: id,
            fromStatus: existing.status,
            toStatus: data.status,
            changedBy: userId,
          },
        });
      }
    });

    if (statusChanged || reviewDateChanged || data.title) {
      await syncDecisionReviewReminders(
        id,
        existing.ownerId ?? userId,
        data.title ?? existing.title,
        nextReviewDate,
        nextStatus
      );
    }

    if (nextStatus === "REVIEWED" || nextStatus === "SUPERSEDED") {
      await clearDecisionReminders(id);
    }

    return decisionRepository.getById(id);
  },

  async recordReview(
    id: string,
    userId: string,
    outcome?: string | null
  ) {
    const existing = await db.decision.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return null;

    assertStatusTransition(existing.status, "REVIEWED");

    await db.$transaction(async (tx) => {
      await tx.decision.update({
        where: { id },
        data: {
          outcome: outcome ?? existing.outcome,
          status: "REVIEWED",
          updatedBy: userId,
        },
      });

      await tx.decisionStatusHistory.create({
        data: {
          decisionId: id,
          fromStatus: existing.status,
          toStatus: "REVIEWED",
          changedBy: userId,
          note: outcome ? outcome.slice(0, 500) : "Review completed",
        },
      });
    });

    await clearDecisionReminders(id);

    return decisionRepository.getById(id);
  },

  async softDelete(id: string, userId: string) {
    await clearDecisionReminders(id);
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
  async getById(id: string) {
    return db.complianceItem.findFirst({ where: { id, deletedAt: null } });
  },

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
  async getById(id: string) {
    return db.risk.findFirst({ where: { id, deletedAt: null } });
  },

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

  async update(id: string, data: Partial<{ title: string; description: string | null; category: RiskCategory; level: RiskLevel; mitigation: string | null; reviewDate: Date | null }>) {
    return db.risk.update({ where: { id }, data });
  },

  async softDelete(id: string) {
    return db.risk.update({ where: { id }, data: { deletedAt: new Date() } });
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
