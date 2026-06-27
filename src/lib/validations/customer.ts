import { z } from "zod";

export const createCustomerSchema = z.object({
  name: z.string().min(1),
  company: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  industry: z.string().optional(),
  notes: z.string().optional(),
});

export const updateCustomerSchema = z.object({
  name: z.string().min(1).optional(),
  company: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  industry: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const customerFeedbackSchema = z.object({
  customerId: z.string().uuid(),
  content: z.string().min(1),
  rating: z.number().int().min(1).max(5).optional(),
  productId: z.string().uuid().optional(),
});

export const customerNoteSchema = z.object({
  customerId: z.string().uuid(),
  note: z.string().min(1),
});

export const customerTimelineSchema = z.object({
  customerId: z.string().uuid(),
});

export const customerAliasSchema = z.object({
  alias: z.string().min(2).max(64).regex(/^[A-Z0-9-]+$/i, "Alias must be alphanumeric with hyphens only."),
});

export const createContractSchema = z.object({
  title: z.string().min(1),
  terms: z.string().optional(),
  content: z.string().optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  value: z.coerce.number().optional(),
  currency: z.string().default("KES"),
  status: z.enum(["DRAFT", "ACTIVE", "EXPIRING", "EXPIRED", "TERMINATED"]).default("DRAFT"),
  isRetainer: z.boolean().default(false),
  parentId: z.string().uuid().optional().nullable(),
});

export const updateContractSchema = createContractSchema.partial();

export const generateContractSchema = z.object({
  terms: z.string().min(10),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  value: z.coerce.number().optional(),
  title: z.string().optional(),
});

export const customerChatSchema = z.object({
  prompt: z.string().min(1),
  conversationId: z.string().uuid().optional(),
});

export const contractSettingsSchema = z.object({
  headerColor: z.string(),
  accentColor: z.string(),
  fontFamily: z.enum(["helvetica", "times", "courier"]),
  logoUrl: z.string(),
  footerText: z.string(),
  includeSignatureBlock: z.boolean(),
  companyName: z.string(),
  contactName: z.string(),
  contactEmail: z.string(),
  location: z.string(),
  documentLabel: z.string(),
  paymentDetails: z.string(),
});
