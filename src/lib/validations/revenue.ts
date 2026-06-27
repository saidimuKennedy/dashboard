import { z } from "zod";

const revenueType = z.enum([
  "subscription",
  "implementation",
  "maintenance",
  "consulting",
  "integration",
  "training",
  "licensing",
  "commission",
  "support",
  "other",
]);

const revenueStatus = z.enum(["paid", "pending", "overdue", "refunded", "written_off"]);

export const createRevenueSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().default("KES"),
  type: revenueType,
  description: z.string().optional(),
  status: revenueStatus.default("paid"),
  isRecurring: z.boolean().default(false),
  paymentMethod: z.string().optional(),
  invoiceRef: z.string().optional(),
  customerId: z.string().uuid(),
  productId: z.string().uuid(),
  contractId: z.string().uuid().optional(),
  recordedAt: z.coerce.date().optional(),
});

export const updateRevenueSchema = z.object({
  amount: z.number().positive().optional(),
  currency: z.string().optional(),
  type: revenueType.optional(),
  description: z.string().optional().nullable(),
  status: revenueStatus.optional(),
  isRecurring: z.boolean().optional(),
  paymentMethod: z.string().optional().nullable(),
  invoiceRef: z.string().optional().nullable(),
  customerId: z.string().uuid().optional().nullable(),
  productId: z.string().uuid().optional().nullable(),
  contractId: z.string().uuid().optional().nullable(),
  recordedAt: z.coerce.date().optional(),
});

export const createExpenseSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().default("KES"),
  category: z.enum([
    "payroll",
    "hosting",
    "marketing",
    "software",
    "travel",
    "contractor",
    "office",
    "tax",
    "other",
  ]),
  description: z.string().optional(),
  recordedAt: z.coerce.date().optional(),
});

export const createCashSnapshotSchema = z.object({
  asOfDate: z.coerce.date(),
  balance: z.number().nonnegative(),
  currency: z.string().default("KES"),
  notes: z.string().optional(),
});

export const createSalesDealSchema = z.object({
  customerId: z.string().uuid(),
  productId: z.string().uuid().optional(),
  stage: z.enum(["lead", "qualified", "proposal", "negotiation", "won", "lost"]),
  expectedValue: z.number().positive(),
  probabilityPercent: z.number().int().min(0).max(100).default(40),
  expectedCloseDate: z.coerce.date().optional(),
});

export const createFinanceContractSchema = z.object({
  customerId: z.string().uuid(),
  productId: z.string().uuid(),
  title: z.string().min(1).optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  mrr: z.number().positive(),
  autoRenew: z.boolean().default(true),
  status: z.enum(["DRAFT", "ACTIVE", "EXPIRING", "EXPIRED", "TERMINATED"]).default("ACTIVE"),
});

export const createFinanceAccountSchema = z.object({
  displayAlias: z.string().min(2).max(64),
  legalName: z.string().optional(),
  industry: z.string().optional(),
  acquisitionSource: z
    .enum(["referral", "organic", "google", "whatsapp", "linkedin", "partner", "cold_outreach", "other"])
    .optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
});
