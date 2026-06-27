import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
const BASE = "/home/saidimu/Desktop/next/dashboard/src/app/api/v1";
function w(p, c) { const f = join(BASE, p); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, c.trimStart() + "\n"); return f; }

const R = {
"journal/route.ts": `import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody, getClientIp, paginatedData } from "@/lib/api/helpers";
import { parsePagination } from "@/lib/api/response";
import { createJournalSchema } from "@/lib/validations";
import { journalRepository } from "@/server/repositories/dashboard.repository";
import { auditLog } from "@/lib/logger/audit";

export const GET = withAuth(async (request, { user }) => {
  const { page, limit, skip } = parsePagination(request.nextUrl.searchParams);
  const { items, total } = await journalRepository.list(user.id, skip, limit);
  return success(paginatedData(items, total, page, limit));
});

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, createJournalSchema);
  if ("error" in parsed) return parsed.error;
  const entry = await journalRepository.create({ ...parsed.data, authorId: user.id });
  await auditLog({ userId: user.id, action: "journal.create", resource: "journal", resourceId: entry.id, ipAddress: getClientIp(request) });
  return success(entry, "Journal entry created.", 201);
});`,

"journal/[id]/route.ts": `import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { updateJournalSchema } from "@/lib/validations";
import { journalRepository } from "@/server/repositories/dashboard.repository";
import { auditLog } from "@/lib/logger/audit";
import { db } from "@/lib/db";

export const PATCH = withAuth(async (request, { user, params }) => {
  const parsed = await parseBody(request, updateJournalSchema);
  if ("error" in parsed) return parsed.error;
  const existing = await db.journalEntry.findFirst({ where: { id: params!.id, deletedAt: null } });
  if (!existing) return notFound("Journal entry not found.");
  const entry = await journalRepository.update(params!.id, parsed.data, user.id);
  await auditLog({ userId: user.id, action: "journal.update", resource: "journal", resourceId: params!.id, ipAddress: getClientIp(request) });
  return success(entry, "Journal entry updated.");
});

export const DELETE = withAuth(async (request, { user, params }) => {
  const existing = await db.journalEntry.findFirst({ where: { id: params!.id, deletedAt: null } });
  if (!existing) return notFound("Journal entry not found.");
  await journalRepository.softDelete(params!.id, user.id);
  await auditLog({ userId: user.id, action: "journal.delete", resource: "journal", resourceId: params!.id, ipAddress: getClientIp(request) });
  return success(null, "Journal entry deleted.");
});`,

"journal/reflect/route.ts": `import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody } from "@/lib/api/helpers";
import { journalReflectSchema } from "@/lib/validations";
import { aiService } from "@/server/ai/ai.service";
import { journalRepository } from "@/server/repositories/dashboard.repository";
import { db } from "@/lib/db";

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, journalReflectSchema);
  if ("error" in parsed) return parsed.error;
  let content = parsed.data.content;
  if (parsed.data.id) {
    const entry = await db.journalEntry.findFirst({ where: { id: parsed.data.id, deletedAt: null } });
    if (!entry) return notFound("Journal entry not found.");
    content = entry.content;
  }
  const result = await aiService.summarize(content!, "journal");
  if (parsed.data.id) await journalRepository.update(parsed.data.id, { aiSummary: result.response }, user.id);
  return success(result);
}, "ai.use");`,

"decisions/route.ts": `import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody, getClientIp, paginatedData } from "@/lib/api/helpers";
import { parsePagination } from "@/lib/api/response";
import { createDecisionSchema } from "@/lib/validations";
import { decisionRepository } from "@/server/repositories/domains.repository";
import { auditLog } from "@/lib/logger/audit";

export const GET = withAuth(async (request) => {
  const { page, limit, skip } = parsePagination(request.nextUrl.searchParams);
  const { items, total } = await decisionRepository.list(skip, limit);
  return success(paginatedData(items, total, page, limit));
});

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, createDecisionSchema);
  if ("error" in parsed) return parsed.error;
  const decision = await decisionRepository.create({ ...parsed.data, ownerId: parsed.data.ownerId ?? user.id });
  await auditLog({ userId: user.id, action: "decision.create", resource: "decisions", resourceId: decision.id, ipAddress: getClientIp(request) });
  return success(decision, "Decision created.", 201);
});`,

"decisions/[id]/route.ts": `import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { updateDecisionSchema } from "@/lib/validations";
import { decisionRepository } from "@/server/repositories/domains.repository";
import { auditLog } from "@/lib/logger/audit";
import { db } from "@/lib/db";

export const PATCH = withAuth(async (request, { user, params }) => {
  const parsed = await parseBody(request, updateDecisionSchema);
  if ("error" in parsed) return parsed.error;
  const existing = await db.decision.findFirst({ where: { id: params!.id, deletedAt: null } });
  if (!existing) return notFound("Decision not found.");
  const decision = await decisionRepository.update(params!.id, parsed.data, user.id);
  await auditLog({ userId: user.id, action: "decision.update", resource: "decisions", resourceId: params!.id, ipAddress: getClientIp(request) });
  return success(decision, "Decision updated.");
});

export const DELETE = withAuth(async (request, { user, params }) => {
  const existing = await db.decision.findFirst({ where: { id: params!.id, deletedAt: null } });
  if (!existing) return notFound("Decision not found.");
  await decisionRepository.softDelete(params!.id, user.id);
  await auditLog({ userId: user.id, action: "decision.delete", resource: "decisions", resourceId: params!.id, ipAddress: getClientIp(request) });
  return success(null, "Decision deleted.");
});`,

"decisions/review/route.ts": `import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { decisionReviewSchema } from "@/lib/validations";
import { decisionRepository } from "@/server/repositories/domains.repository";
import { auditLog } from "@/lib/logger/audit";
import { db } from "@/lib/db";

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, decisionReviewSchema);
  if ("error" in parsed) return parsed.error;
  const existing = await db.decision.findFirst({ where: { id: parsed.data.id, deletedAt: null } });
  if (!existing) return notFound("Decision not found.");
  const decision = await decisionRepository.update(parsed.data.id, { outcome: parsed.data.outcome, status: parsed.data.status ?? "REVIEWED" }, user.id);
  await auditLog({ userId: user.id, action: "decision.review", resource: "decisions", resourceId: parsed.data.id, ipAddress: getClientIp(request) });
  return success(decision, "Decision reviewed.");
});`,

"customers/route.ts": `import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody, getClientIp, paginatedData } from "@/lib/api/helpers";
import { parsePagination } from "@/lib/api/response";
import { createCustomerSchema } from "@/lib/validations";
import { customerRepository } from "@/server/repositories/dashboard.repository";
import { auditLog } from "@/lib/logger/audit";

export const GET = withAuth(async (request) => {
  const { page, limit, skip } = parsePagination(request.nextUrl.searchParams);
  const search = request.nextUrl.searchParams.get("search") ?? undefined;
  const { items, total } = await customerRepository.list(skip, limit, search);
  return success(paginatedData(items, total, page, limit));
}, "customer.manage");

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, createCustomerSchema);
  if ("error" in parsed) return parsed.error;
  const customer = await customerRepository.create(parsed.data);
  await auditLog({ userId: user.id, action: "customer.create", resource: "customers", resourceId: customer.id, ipAddress: getClientIp(request) });
  return success(customer, "Customer created.", 201);
}, "customer.manage");`,

"customers/[id]/route.ts": `import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { updateCustomerSchema } from "@/lib/validations";
import { customerRepository } from "@/server/repositories/dashboard.repository";
import { auditLog } from "@/lib/logger/audit";

export const GET = withAuth(async (_request, { params }) => {
  const customer = await customerRepository.getById(params!.id);
  if (!customer) return notFound("Customer not found.");
  return success(customer);
}, "customer.manage");

export const PATCH = withAuth(async (request, { user, params }) => {
  const parsed = await parseBody(request, updateCustomerSchema);
  if ("error" in parsed) return parsed.error;
  const existing = await customerRepository.getById(params!.id);
  if (!existing) return notFound("Customer not found.");
  const customer = await customerRepository.update(params!.id, parsed.data);
  await auditLog({ userId: user.id, action: "customer.update", resource: "customers", resourceId: params!.id, ipAddress: getClientIp(request) });
  return success(customer, "Customer updated.");
}, "customer.manage");

export const DELETE = withAuth(async (request, { user, params }) => {
  const existing = await customerRepository.getById(params!.id);
  if (!existing) return notFound("Customer not found.");
  await customerRepository.softDelete(params!.id);
  await auditLog({ userId: user.id, action: "customer.delete", resource: "customers", resourceId: params!.id, ipAddress: getClientIp(request) });
  return success(null, "Customer deleted.");
}, "customer.manage");`,

"customers/feedback/route.ts": `import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { customerFeedbackSchema } from "@/lib/validations";
import { auditLog } from "@/lib/logger/audit";
import { db } from "@/lib/db";

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, customerFeedbackSchema);
  if ("error" in parsed) return parsed.error;
  const feedback = await db.customerFeedback.create({ data: parsed.data });
  await auditLog({ userId: user.id, action: "customer.feedback", resource: "customers", resourceId: parsed.data.customerId, ipAddress: getClientIp(request) });
  return success(feedback, "Feedback recorded.", 201);
}, "customer.manage");`,

"customers/note/route.ts": `import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { customerNoteSchema } from "@/lib/validations";
import { customerRepository } from "@/server/repositories/dashboard.repository";
import { auditLog } from "@/lib/logger/audit";

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, customerNoteSchema);
  if ("error" in parsed) return parsed.error;
  const customer = await customerRepository.getById(parsed.data.customerId);
  if (!customer) return notFound("Customer not found.");
  const updated = await customerRepository.update(parsed.data.customerId, { notes: parsed.data.note });
  await auditLog({ userId: user.id, action: "customer.note", resource: "customers", resourceId: parsed.data.customerId, ipAddress: getClientIp(request) });
  return success(updated, "Note added.");
}, "customer.manage");`,

"customers/timeline/route.ts": `import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { customerTimelineSchema } from "@/lib/validations";
import { customerRepository } from "@/server/repositories/dashboard.repository";

export const GET = withAuth(async (request) => {
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = customerTimelineSchema.safeParse(params);
  if (!parsed.success) return notFound("Customer ID required.");
  const customer = await customerRepository.getById(parsed.data.customerId);
  if (!customer) return notFound("Customer not found.");
  const timeline = await customerRepository.getTimeline(parsed.data.customerId);
  return success(timeline);
}, "customer.manage");`,

"products/route.ts": `import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody, getClientIp, paginatedData } from "@/lib/api/helpers";
import { parsePagination } from "@/lib/api/response";
import { createProductSchema } from "@/lib/validations";
import { productRepository } from "@/server/repositories/domains.repository";
import { auditLog } from "@/lib/logger/audit";
import { slugify } from "@/lib/utils";

export const GET = withAuth(async (request) => {
  const { page, limit, skip } = parsePagination(request.nextUrl.searchParams);
  const { items, total } = await productRepository.list(skip, limit);
  return success(paginatedData(items, total, page, limit));
});

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, createProductSchema);
  if ("error" in parsed) return parsed.error;
  const product = await productRepository.create({ name: parsed.data.name, slug: slugify(parsed.data.name), description: parsed.data.description });
  await auditLog({ userId: user.id, action: "product.create", resource: "products", resourceId: product.id, ipAddress: getClientIp(request) });
  return success(product, "Product created.", 201);
});`,

"products/[id]/route.ts": `import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { updateProductSchema } from "@/lib/validations";
import { productRepository } from "@/server/repositories/domains.repository";
import { auditLog } from "@/lib/logger/audit";

export const PATCH = withAuth(async (request, { user, params }) => {
  const parsed = await parseBody(request, updateProductSchema);
  if ("error" in parsed) return parsed.error;
  const existing = await productRepository.getById(params!.id);
  if (!existing) return notFound("Product not found.");
  const product = await productRepository.update(params!.id, parsed.data);
  await auditLog({ userId: user.id, action: "product.update", resource: "products", resourceId: params!.id, ipAddress: getClientIp(request) });
  return success(product, "Product updated.");
});

export const DELETE = withAuth(async (request, { user, params }) => {
  const existing = await productRepository.getById(params!.id);
  if (!existing) return notFound("Product not found.");
  await productRepository.softDelete(params!.id);
  await auditLog({ userId: user.id, action: "product.delete", resource: "products", resourceId: params!.id, ipAddress: getClientIp(request) });
  return success(null, "Product deleted.");
});`,

"products/releases/route.ts": `import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { productReleaseSchema } from "@/lib/validations";
import { auditLog } from "@/lib/logger/audit";
import { db } from "@/lib/db";

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, productReleaseSchema);
  if ("error" in parsed) return parsed.error;
  const release = await db.productRelease.create({ data: parsed.data });
  await auditLog({ userId: user.id, action: "product.release", resource: "products", resourceId: parsed.data.productId, ipAddress: getClientIp(request) });
  return success(release, "Release recorded.", 201);
});`,

"products/roadmap/route.ts": `import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody } from "@/lib/api/helpers";
import { productRoadmapSchema } from "@/lib/validations";
import { productRepository } from "@/server/repositories/domains.repository";
import { db } from "@/lib/db";

export const POST = withAuth(async (request) => {
  const parsed = await parseBody(request, productRoadmapSchema);
  if ("error" in parsed) return parsed.error;
  const product = await productRepository.getById(parsed.data.productId);
  if (!product) return success({ productId: parsed.data.productId, items: parsed.data.items ?? [] });
  const ideas = parsed.data.items?.length
    ? await db.idea.createMany({ data: parsed.data.items.map((item) => ({ ...item, productId: parsed.data.productId })) })
    : null;
  return success({ productId: parsed.data.productId, ideas });
});`,
};

console.log(Object.entries(R).map(([p,c]) => w(p,c)).join("\n"));
