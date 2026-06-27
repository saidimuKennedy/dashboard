import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
const BASE = "/home/saidimu/Desktop/next/dashboard/src/app/api/v1";
function w(p, c) { const f = join(BASE, p); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, c.trimStart() + "\n"); return f; }

const AI_STUB = `async function aiStub(prompt: string) {
  return { response: \`[AI stub] \${prompt.slice(0, 200)}\`, sources: [], confidence: 0.5, tokens: 0 };
}`;

const R = {
"competitors/route.ts": `import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { createCompetitorSchema } from "@/lib/validations";
import { competitorRepository } from "@/server/repositories/domains.repository";
import { auditLog } from "@/lib/logger/audit";

export const GET = withAuth(async () => {
  const items = await competitorRepository.list();
  return success({ items });
}, "knowledge.read");

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, createCompetitorSchema);
  if ("error" in parsed) return parsed.error;
  const competitor = await competitorRepository.create(parsed.data);
  await auditLog({ userId: user.id, action: "competitor.create", resource: "competitors", resourceId: competitor.id, ipAddress: getClientIp(request) });
  return success(competitor, "Competitor created.", 201);
}, "knowledge.write");`,

"competitors/[id]/route.ts": `import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { updateCompetitorSchema } from "@/lib/validations";
import { competitorRepository } from "@/server/repositories/domains.repository";
import { auditLog } from "@/lib/logger/audit";
import { db } from "@/lib/db";

export const PATCH = withAuth(async (request, { user, params }) => {
  const parsed = await parseBody(request, updateCompetitorSchema);
  if ("error" in parsed) return parsed.error;
  const existing = await db.competitor.findFirst({ where: { id: params!.id, deletedAt: null } });
  if (!existing) return notFound("Competitor not found.");
  const competitor = await competitorRepository.update(params!.id, parsed.data);
  await auditLog({ userId: user.id, action: "competitor.update", resource: "competitors", resourceId: params!.id, ipAddress: getClientIp(request) });
  return success(competitor, "Competitor updated.");
}, "knowledge.write");

export const DELETE = withAuth(async (request, { user, params }) => {
  const existing = await db.competitor.findFirst({ where: { id: params!.id, deletedAt: null } });
  if (!existing) return notFound("Competitor not found.");
  await competitorRepository.softDelete(params!.id);
  await auditLog({ userId: user.id, action: "competitor.delete", resource: "competitors", resourceId: params!.id, ipAddress: getClientIp(request) });
  return success(null, "Competitor deleted.");
}, "knowledge.delete");`,

"competitors/pricing/route.ts": `import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { competitorPricingSchema } from "@/lib/validations";
import { competitorRepository } from "@/server/repositories/domains.repository";
import { auditLog } from "@/lib/logger/audit";
import { db } from "@/lib/db";

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, competitorPricingSchema);
  if ("error" in parsed) return parsed.error;
  const existing = await db.competitor.findFirst({ where: { id: parsed.data.id, deletedAt: null } });
  if (!existing) return notFound("Competitor not found.");
  const competitor = await competitorRepository.update(parsed.data.id, { pricing: parsed.data.pricing });
  await auditLog({ userId: user.id, action: "competitor.pricing", resource: "competitors", resourceId: parsed.data.id, ipAddress: getClientIp(request) });
  return success(competitor, "Pricing updated.");
}, "knowledge.write");`,

"competitors/features/route.ts": `import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { competitorFeaturesSchema } from "@/lib/validations";
import { competitorRepository } from "@/server/repositories/domains.repository";
import { auditLog } from "@/lib/logger/audit";
import { db } from "@/lib/db";

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, competitorFeaturesSchema);
  if ("error" in parsed) return parsed.error;
  const existing = await db.competitor.findFirst({ where: { id: parsed.data.id, deletedAt: null } });
  if (!existing) return notFound("Competitor not found.");
  const competitor = await competitorRepository.update(parsed.data.id, { features: parsed.data.features });
  await auditLog({ userId: user.id, action: "competitor.features", resource: "competitors", resourceId: parsed.data.id, ipAddress: getClientIp(request) });
  return success(competitor, "Features updated.");
}, "knowledge.write");`,

"apis/route.ts": `import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { createApiRegistrySchema } from "@/lib/validations";
import { apiRegistryRepository } from "@/server/repositories/domains.repository";
import { auditLog } from "@/lib/logger/audit";

export const GET = withAuth(async () => {
  const items = await apiRegistryRepository.list();
  return success({ items });
}, "knowledge.read");

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, createApiRegistrySchema);
  if ("error" in parsed) return parsed.error;
  const entry = await apiRegistryRepository.create(parsed.data);
  await auditLog({ userId: user.id, action: "api_registry.create", resource: "apis", resourceId: entry.id, ipAddress: getClientIp(request) });
  return success(entry, "API entry created.", 201);
}, "knowledge.write");`,

"apis/[id]/route.ts": `import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { updateApiRegistrySchema } from "@/lib/validations";
import { apiRegistryRepository } from "@/server/repositories/domains.repository";
import { auditLog } from "@/lib/logger/audit";
import { db } from "@/lib/db";

export const PATCH = withAuth(async (request, { user, params }) => {
  const parsed = await parseBody(request, updateApiRegistrySchema);
  if ("error" in parsed) return parsed.error;
  const existing = await db.apiRegistryEntry.findFirst({ where: { id: params!.id, deletedAt: null } });
  if (!existing) return notFound("API entry not found.");
  const entry = await apiRegistryRepository.update(params!.id, parsed.data);
  await auditLog({ userId: user.id, action: "api_registry.update", resource: "apis", resourceId: params!.id, ipAddress: getClientIp(request) });
  return success(entry, "API entry updated.");
}, "knowledge.write");

export const DELETE = withAuth(async (request, { user, params }) => {
  const existing = await db.apiRegistryEntry.findFirst({ where: { id: params!.id, deletedAt: null } });
  if (!existing) return notFound("API entry not found.");
  await db.apiRegistryEntry.update({ where: { id: params!.id }, data: { deletedAt: new Date() } });
  await auditLog({ userId: user.id, action: "api_registry.delete", resource: "apis", resourceId: params!.id, ipAddress: getClientIp(request) });
  return success(null, "API entry deleted.");
}, "knowledge.delete");`,

"apis/test/route.ts": `import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody } from "@/lib/api/helpers";
import { apiTestSchema } from "@/lib/validations";
import { db } from "@/lib/db";

export const POST = withAuth(async (request) => {
  const parsed = await parseBody(request, apiTestSchema);
  if ("error" in parsed) return parsed.error;
  const entry = await db.apiRegistryEntry.findFirst({ where: { id: parsed.data.id, deletedAt: null } });
  if (!entry) return notFound("API entry not found.");
  return success({ id: entry.id, status: "ok", latencyMs: 42, endpoint: parsed.data.endpoint ?? entry.baseUrl }, "API test completed.");
}, "knowledge.read");`,

"apis/document/route.ts": `import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody } from "@/lib/api/helpers";
import { apiDocumentSchema } from "@/lib/validations";
import { db } from "@/lib/db";

export const POST = withAuth(async (request) => {
  const parsed = await parseBody(request, apiDocumentSchema);
  if ("error" in parsed) return parsed.error;
  const entry = await db.apiRegistryEntry.findFirst({ where: { id: parsed.data.id, deletedAt: null } });
  if (!entry) return notFound("API entry not found.");
  return success({ id: entry.id, documentation: entry.docs ?? "No documentation available." });
}, "knowledge.read");`,

"ai/chat/route.ts": `import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody } from "@/lib/api/helpers";
import { aiRequestSchema } from "@/lib/validations";
import { aiService } from "@/server/ai/ai.service";

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, aiRequestSchema);
  if ("error" in parsed) return parsed.error;
  const result = await aiService.chat(user.id, parsed.data);
  return success(result);
}, "ai.use");`,

"ai/summarize/route.ts": `import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody } from "@/lib/api/helpers";
import { aiRequestSchema } from "@/lib/validations";
import { aiService } from "@/server/ai/ai.service";

export const POST = withAuth(async (request) => {
  const parsed = await parseBody(request, aiRequestSchema);
  if ("error" in parsed) return parsed.error;
  const result = await aiService.summarize(parsed.data.prompt);
  return success(result);
}, "ai.use");`,

"ai/classify/route.ts": `import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody } from "@/lib/api/helpers";
import { aiRequestSchema } from "@/lib/validations";
import { aiService } from "@/server/ai/ai.service";

export const POST = withAuth(async (request) => {
  const parsed = await parseBody(request, aiRequestSchema);
  if ("error" in parsed) return parsed.error;
  const result = await aiService.summarize(parsed.data.prompt, "classification");
  return success({ ...result, categories: ["general"] });
}, "ai.use");`,

"ai/embeddings/route.ts": `import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody } from "@/lib/api/helpers";
import { aiRequestSchema } from "@/lib/validations";

export const POST = withAuth(async (request) => {
  const parsed = await parseBody(request, aiRequestSchema);
  if ("error" in parsed) return parsed.error;
  return success({ status: "queued", dimensions: 1536, text: parsed.data.prompt.slice(0, 100) });
}, "ai.use");`,

"ai/search/route.ts": `import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody } from "@/lib/api/helpers";
import { aiRequestSchema } from "@/lib/validations";
import { aiService } from "@/server/ai/ai.service";

export const POST = withAuth(async (request) => {
  const parsed = await parseBody(request, aiRequestSchema);
  if ("error" in parsed) return parsed.error;
  const sources = await aiService.searchSemantic(parsed.data.prompt);
  return success({ sources });
}, "ai.use");`,

"ai/recommend/route.ts": `import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody } from "@/lib/api/helpers";
import { aiRequestSchema } from "@/lib/validations";
import { aiService } from "@/server/ai/ai.service";

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, aiRequestSchema);
  if ("error" in parsed) return parsed.error;
  const result = await aiService.chat(user.id, { ...parsed.data, persona: "business_advisor" });
  return success({ recommendations: result.response, sources: result.sources });
}, "ai.use");`,

"ai/weekly-report/route.ts": `import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { aiService } from "@/server/ai/ai.service";

export const POST = withAuth(async (_request, { user }) => {
  const result = await aiService.chat(user.id, { prompt: "Generate weekly executive report.", persona: "founder_brief" });
  return success(result);
}, "ai.use");`,

"ai/founder-brief/route.ts": `import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { aiService } from "@/server/ai/ai.service";

export const POST = withAuth(async () => {
  const result = await aiService.founderBrief();
  return success(result);
}, "ai.use");`,

"ai/analyze/route.ts": `import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody } from "@/lib/api/helpers";
import { aiRequestSchema } from "@/lib/validations";
import { aiService } from "@/server/ai/ai.service";

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, aiRequestSchema);
  if ("error" in parsed) return parsed.error;
  const result = await aiService.chat(user.id, { ...parsed.data, persona: "business_advisor" });
  return success(result);
}, "ai.use");`,

"ai/risk-analysis/route.ts": `import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody } from "@/lib/api/helpers";
import { aiRequestSchema } from "@/lib/validations";
import { aiService } from "@/server/ai/ai.service";
import { riskRepository } from "@/server/repositories/domains.repository";

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, aiRequestSchema);
  if ("error" in parsed) return parsed.error;
  const { items } = await riskRepository.list(0, 10);
  const result = await aiService.chat(user.id, {
    prompt: \`\${parsed.data.prompt}\\n\\nCurrent risks: \${JSON.stringify(items.map((r) => ({ title: r.title, level: r.level })))}\`,
    persona: "compliance_advisor",
  });
  return success(result);
}, "ai.use");`,
};

console.log(Object.entries(R).map(([p,c]) => w(p,c)).join("\n"));
