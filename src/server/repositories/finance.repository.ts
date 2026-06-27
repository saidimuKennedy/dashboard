import { db } from "@/lib/db";
import { customerRepository } from "@/server/repositories/dashboard.repository";

export const financeRepository = {
  async listFormOptions() {
    const [customers, products, contracts] = await Promise.all([
      db.customer.findMany({
        where: { deletedAt: null },
        include: { alias: true },
        orderBy: { createdAt: "desc" },
      }),
      db.product.findMany({
        where: { deletedAt: null },
        orderBy: { name: "asc" },
      }),
      db.customerContract.findMany({
        where: { isRetainer: false, status: { in: ["ACTIVE", "EXPIRING", "DRAFT"] } },
        include: {
          customer: { include: { alias: true } },
          product: true,
        },
        orderBy: { endDate: "desc" },
      }),
    ]);

    return {
      customers: customers.map((c) => ({
        id: c.id,
        displayAlias: c.alias?.alias ?? c.name,
      })),
      products: products.map((p) => ({ id: p.id, name: p.name })),
      contracts: contracts.map((c) => ({
        id: c.id,
        label: `${c.customer.alias?.alias ?? c.customer.name} — ${c.product?.name ?? c.title}`,
      })),
    };
  },

  async createRevenue(
    data: {
      amount: number;
      currency?: string;
      type: string;
      description?: string;
      status?: string;
      isRecurring?: boolean;
      paymentMethod?: string;
      invoiceRef?: string;
      customerId?: string;
      productId?: string;
      contractId?: string;
      recordedAt?: Date;
    },
    userId: string
  ) {
    return db.revenueEntry.create({
      data: {
        amount: data.amount,
        currency: data.currency ?? "KES",
        type: data.type,
        description: data.description,
        status: data.status ?? "paid",
        isRecurring: data.isRecurring ?? false,
        paymentMethod: data.paymentMethod,
        invoiceRef: data.invoiceRef,
        recordedAt: data.recordedAt ?? new Date(),
        createdBy: userId,
        ...(data.customerId && { customer: { connect: { id: data.customerId } } }),
        ...(data.productId && { product: { connect: { id: data.productId } } }),
        ...(data.contractId && { contract: { connect: { id: data.contractId } } }),
      },
    });
  },

  async createExpense(data: {
    amount: number;
    currency?: string;
    category: string;
    description?: string;
    recordedAt?: Date;
  }) {
    return db.expense.create({
      data: {
        amount: data.amount,
        currency: data.currency ?? "KES",
        category: data.category,
        description: data.description,
        recordedAt: data.recordedAt ?? new Date(),
      },
    });
  },

  async createCashSnapshot(
    data: { asOfDate: Date; balance: number; currency?: string; notes?: string },
    userId: string
  ) {
    return db.cashSnapshot.create({
      data: {
        asOfDate: data.asOfDate,
        balance: data.balance,
        currency: data.currency ?? "KES",
        notes: data.notes,
        createdBy: userId,
      },
    });
  },

  async createSalesDeal(
    data: {
      customerId: string;
      productId?: string;
      stage: string;
      expectedValue: number;
      probabilityPercent?: number;
      expectedCloseDate?: Date;
    },
    userId: string
  ) {
    return db.salesDeal.create({
      data: {
        customer: { connect: { id: data.customerId } },
        ...(data.productId && { product: { connect: { id: data.productId } } }),
        stage: data.stage,
        expectedValue: data.expectedValue,
        probabilityPercent: data.probabilityPercent ?? 40,
        expectedCloseDate: data.expectedCloseDate,
        createdBy: userId,
      },
    });
  },

  async createContract(
    data: {
      customerId: string;
      productId?: string;
      title: string;
      startDate: Date;
      endDate: Date;
      mrr?: number;
      value?: number;
      autoRenew?: boolean;
      status?: "DRAFT" | "ACTIVE" | "EXPIRING" | "EXPIRED" | "TERMINATED";
    },
    userId: string
  ) {
    return db.customerContract.create({
      data: {
        customer: { connect: { id: data.customerId } },
        ...(data.productId && { product: { connect: { id: data.productId } } }),
        title: data.title,
        startDate: data.startDate,
        endDate: data.endDate,
        mrr: data.mrr,
        value: data.value ?? data.mrr,
        autoRenew: data.autoRenew ?? true,
        status: data.status ?? "ACTIVE",
        createdBy: userId,
        updatedBy: userId,
      },
    });
  },

  async createAccount(
    data: {
      displayAlias: string;
      legalName?: string;
      industry?: string;
      acquisitionSource?: string;
      email?: string;
      phone?: string;
    },
    userId: string
  ) {
    const customer = await db.customer.create({
      data: {
        name: data.legalName?.trim() || data.displayAlias.trim(),
        company: data.legalName?.trim() || undefined,
        email: data.email,
        phone: data.phone,
        industry: data.industry,
        acquisitionSource: data.acquisitionSource,
        status: "ACTIVE",
        createdBy: userId,
      },
    });
    await customerRepository.upsertAlias(customer.id, data.displayAlias.trim().toUpperCase());
    return customer;
  },
};
