import { db } from "@/lib/db";
import { buildMaskedCustomerContext, generateDefaultAlias, type PiiProfile } from "@/lib/ai/pii-mask";
import { DataClassification, UserRole } from "@prisma/client";
import {
  type EntityRegistryEntry,
  type RagEntityType,
  type SerializedDocument,
  RAG_ENTITY_TYPES,
} from "@/server/ai/rag/types";

function joinParts(parts: (string | null | undefined)[]): string {
  return parts.filter(Boolean).join("\n");
}

function truncate(text: string, max = 6000): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

const knowledgeEntry: EntityRegistryEntry = {
  entityType: "knowledge",
  permission: "knowledge.read",
  contextRoute: "/knowledge",
  detailPath: (id) => `/knowledge?open=${id}`,
  async fetchById(id) {
    return db.knowledgeArticle.findFirst({ where: { id, deletedAt: null } });
  },
  serialize(record) {
    const r = record as { title: string; content: string; summary?: string | null; status: string };
    if (!r?.title) return null;
    return {
      title: r.title,
      body: truncate(joinParts([`Status: ${r.status}`, r.summary, r.content])),
      url: `/knowledge`,
    };
  },
  async listIds() {
    return (await db.knowledgeArticle.findMany({ where: { deletedAt: null }, select: { id: true } })).map((r) => r.id);
  },
};

const researchEntry: EntityRegistryEntry = {
  entityType: "research",
  permission: "knowledge.read",
  contextRoute: "/research",
  detailPath: (id) => `/research?open=${id}`,
  async fetchById(id) {
    return db.researchTopic.findFirst({
      where: { id, deletedAt: null },
      include: { tags: { include: { tag: true } }, bookmarks: true },
    });
  },
  serialize(record) {
    const r = record as {
      title: string;
      description?: string | null;
      stage: string;
      notes?: string | null;
      summary?: string | null;
      aiAnalysis?: unknown;
      tags?: { tag: { name: string } }[];
      bookmarks?: { title?: string | null; url: string; notes?: string | null }[];
    };
    if (!r?.title) return null;
    const tags = r.tags?.map((t) => t.tag.name).join(", ");
    const bookmarks = r.bookmarks
      ?.map((b) => `- ${b.title ?? b.url}${b.notes ? `: ${b.notes}` : ""}`)
      .join("\n");
    const analysis =
      r.aiAnalysis && typeof r.aiAnalysis === "object" && "summary" in (r.aiAnalysis as object)
        ? String((r.aiAnalysis as { summary?: string }).summary ?? "")
        : "";
    return {
      title: r.title,
      body: truncate(
        joinParts([
          `Stage: ${r.stage}`,
          tags ? `Tags: ${tags}` : null,
          r.description,
          r.summary,
          analysis,
          r.notes,
          bookmarks ? `Bookmarks:\n${bookmarks}` : null,
        ])
      ),
      url: `/research`,
    };
  },
  async listIds() {
    return (await db.researchTopic.findMany({ where: { deletedAt: null }, select: { id: true } })).map((r) => r.id);
  },
};

const journalEntry: EntityRegistryEntry = {
  entityType: "journal",
  permission: "knowledge.read",
  contextRoute: "/journal",
  detailPath: (id) => `/journal?open=${id}`,
  async fetchById(id) {
    return db.journalEntry.findFirst({ where: { id, deletedAt: null } });
  },
  serialize(record) {
    const r = record as {
      content: string;
      lessons?: string | null;
      challenges?: string | null;
      wins?: string | null;
      mood?: string | null;
      aiSummary?: string | null;
      date: Date;
      visibility: DataClassification;
    };
    if (!r?.content) return null;
    const date = r.date.toISOString().slice(0, 10);
    return {
      title: `Journal ${date}`,
      body: truncate(
        joinParts([
          `Visibility: ${r.visibility}`,
          r.mood ? `Mood: ${r.mood}` : null,
          r.wins ? `Wins: ${r.wins}` : null,
          r.challenges ? `Challenges: ${r.challenges}` : null,
          r.lessons ? `Lessons: ${r.lessons}` : null,
          r.aiSummary,
          r.content,
        ])
      ),
      url: `/journal`,
    };
  },
  async listIds() {
    return (await db.journalEntry.findMany({ where: { deletedAt: null }, select: { id: true } })).map((r) => r.id);
  },
};

const decisionEntry: EntityRegistryEntry = {
  entityType: "decision",
  permission: "knowledge.read",
  contextRoute: "/decisions",
  detailPath: (id) => `/decisions?open=${id}`,
  async fetchById(id) {
    return db.decision.findFirst({ where: { id, deletedAt: null } });
  },
  serialize(record) {
    const r = record as {
      title: string;
      context: string;
      alternatives?: string | null;
      decision: string;
      reasoning?: string | null;
      outcome?: string | null;
      evidence?: string | null;
      status: string;
    };
    if (!r?.title) return null;
    return {
      title: r.title,
      body: truncate(
        joinParts([
          `Status: ${r.status}`,
          `Context: ${r.context}`,
          r.alternatives ? `Alternatives: ${r.alternatives}` : null,
          `Decision: ${r.decision}`,
          r.reasoning ? `Reasoning: ${r.reasoning}` : null,
          r.outcome ? `Outcome: ${r.outcome}` : null,
          r.evidence ? `Evidence: ${r.evidence}` : null,
        ])
      ),
      url: `/decisions`,
    };
  },
  async listIds() {
    return (await db.decision.findMany({ where: { deletedAt: null }, select: { id: true } })).map((r) => r.id);
  },
};

const meetingEntry: EntityRegistryEntry = {
  entityType: "meeting",
  permission: "knowledge.read",
  contextRoute: "/meetings",
  detailPath: (id) => `/meetings?open=${id}`,
  async fetchById(id) {
    return db.meeting.findFirst({
      where: { id, deletedAt: null },
      include: {
        customer: { include: { alias: true } },
        actionItems: { where: { deletedAt: null } },
      },
    });
  },
  serialize(record) {
    const r = record as {
      title: string;
      status: string;
      type: string;
      outcome?: string | null;
      scheduledAt?: Date | null;
      agenda?: string | null;
      minutes?: string | null;
      transcript?: string | null;
      outcomeReport?: string | null;
      aiSummary?: string | null;
      aiEvaluation?: string | null;
      customer?: { alias?: { alias: string } | null } | null;
      actionItems?: { title: string; completed: boolean }[];
    };
    if (!r?.title) return null;
    const customerLabel = r.customer?.alias?.alias ?? "Unlinked customer";
    const actions = r.actionItems?.map((a) => `- ${a.title}${a.completed ? " (done)" : ""}`).join("\n");
    return {
      title: r.title,
      body: truncate(
        joinParts([
          `Status: ${r.status}`,
          `Type: ${r.type}`,
          r.outcome ? `Outcome: ${r.outcome}` : null,
          r.scheduledAt ? `Scheduled: ${r.scheduledAt.toISOString()}` : null,
          `Customer: ${customerLabel}`,
          r.agenda ? `Agenda:\n${r.agenda}` : null,
          r.outcomeReport ? `Outcome report:\n${r.outcomeReport}` : null,
          r.minutes ? `Minutes:\n${r.minutes}` : null,
          r.aiSummary ? `AI summary:\n${r.aiSummary}` : null,
          r.aiEvaluation ? `AI evaluation:\n${r.aiEvaluation}` : null,
          r.transcript ? `Transcript:\n${r.transcript}` : null,
          actions ? `Action items:\n${actions}` : null,
        ])
      ),
      url: `/meetings`,
    };
  },
  async listIds() {
    return (await db.meeting.findMany({ where: { deletedAt: null }, select: { id: true } })).map((r) => r.id);
  },
};

const ideaEntry: EntityRegistryEntry = {
  entityType: "idea",
  permission: "knowledge.read",
  contextRoute: "/products",
  detailPath: () => `/products`,
  async fetchById(id) {
    return db.idea.findFirst({ where: { id, deletedAt: null }, include: { product: true } });
  },
  serialize(record) {
    const r = record as {
      title: string;
      description?: string | null;
      category?: string | null;
      priority?: string | null;
      stage?: string | null;
      status: string;
      product?: { name: string } | null;
    };
    if (!r?.title) return null;
    return {
      title: r.title,
      body: truncate(
        joinParts([
          `Status: ${r.status}`,
          r.product ? `Product: ${r.product.name}` : null,
          r.category ? `Category: ${r.category}` : null,
          r.priority ? `Priority: ${r.priority}` : null,
          r.stage ? `Stage: ${r.stage}` : null,
          r.description,
        ])
      ),
      url: `/products`,
    };
  },
  async listIds() {
    return (await db.idea.findMany({ where: { deletedAt: null }, select: { id: true } })).map((r) => r.id);
  },
};

const productEntry: EntityRegistryEntry = {
  entityType: "product",
  permission: "knowledge.read",
  contextRoute: "/products",
  detailPath: (id) => `/products?open=${id}`,
  async fetchById(id) {
    return db.product.findFirst({ where: { id, deletedAt: null } });
  },
  serialize(record) {
    const r = record as { name: string; description?: string | null; status: string };
    if (!r?.name) return null;
    return {
      title: r.name,
      body: truncate(joinParts([`Status: ${r.status}`, r.description])),
      url: `/products`,
    };
  },
  async listIds() {
    return (await db.product.findMany({ where: { deletedAt: null }, select: { id: true } })).map((r) => r.id);
  },
};

const productReleaseEntry: EntityRegistryEntry = {
  entityType: "product_release",
  permission: "knowledge.read",
  contextRoute: "/products",
  detailPath: () => `/products`,
  async fetchById(id) {
    return db.productRelease.findFirst({ where: { id }, include: { product: true } });
  },
  serialize(record) {
    const r = record as { version: string; notes?: string | null; releasedAt: Date; product: { name: string } };
    if (!r?.version) return null;
    return {
      title: `${r.product.name} v${r.version}`,
      body: truncate(joinParts([`Released: ${r.releasedAt.toISOString().slice(0, 10)}`, r.notes])),
      url: `/products`,
    };
  },
  async listIds() {
    return (await db.productRelease.findMany({ select: { id: true } })).map((r) => r.id);
  },
};

const customerEntry: EntityRegistryEntry = {
  entityType: "customer",
  permission: "knowledge.read",
  contextRoute: "/customers",
  detailPath: (id) => `/customers?open=${id}`,
  async fetchById(id) {
    return db.customer.findFirst({
      where: { id, deletedAt: null },
      include: {
        alias: true,
        products: { include: { product: true } },
        contracts: { where: { isRetainer: false }, take: 1, orderBy: { endDate: "asc" } },
        revenue: { where: { deletedAt: null }, take: 5 },
      },
    });
  },
  serialize(record) {
    const r = record as {
      id: string;
      industry?: string | null;
      status: string;
      notes?: string | null;
      alias?: { alias: string } | null;
      products?: { product: { name: string } }[];
      contracts?: { title: string; status: string; endDate: Date }[];
      revenue?: { amount: unknown; currency?: string }[];
    };
    if (!r?.id) return null;
    const alias = r.alias?.alias ?? generateDefaultAlias(r.industry);
    const profile: PiiProfile = { alias, name: null, company: null, email: null, phone: null };
    const totalRevenue = r.revenue?.reduce((sum, e) => sum + Number(e.amount), 0) ?? 0;
    const contract = r.contracts?.[0];
    const contractSummary = contract
      ? `${contract.title}, status ${contract.status}, ends ${contract.endDate.toISOString().slice(0, 10)}`
      : undefined;
    const body = buildMaskedCustomerContext(profile, {
      industry: r.industry,
      status: r.status,
      notes: r.notes,
      products: r.products?.map((p) => p.product.name),
      totalRevenue,
      currency: r.revenue?.[0]?.currency ?? "KES",
      contractSummary,
    });
    return { title: `Customer ${alias}`, body: truncate(body), url: `/customers` };
  },
  async listIds() {
    return (await db.customer.findMany({ where: { deletedAt: null }, select: { id: true } })).map((r) => r.id);
  },
};

const customerContractEntry: EntityRegistryEntry = {
  entityType: "customer_contract",
  permission: "knowledge.read",
  contextRoute: "/customers",
  detailPath: () => `/customers`,
  async fetchById(id) {
    return db.customerContract.findFirst({
      where: { id },
      include: { customer: { include: { alias: true } } },
    });
  },
  serialize(record) {
    const r = record as {
      title: string;
      status: string;
      terms?: string | null;
      startDate: Date;
      endDate: Date;
      value?: unknown;
      currency: string;
      customer: { industry?: string | null; alias?: { alias: string } | null };
    };
    if (!r?.title) return null;
    const alias = r.customer.alias?.alias ?? generateDefaultAlias(r.customer.industry);
    return {
      title: `Contract: ${r.title} (${alias})`,
      body: truncate(
        joinParts([
          `Customer alias: ${alias}`,
          `Status: ${r.status}`,
          `Period: ${r.startDate.toISOString().slice(0, 10)} – ${r.endDate.toISOString().slice(0, 10)}`,
          r.value != null ? `Value: ${r.currency} ${Number(r.value).toLocaleString()}` : null,
          r.terms ? `Terms: ${r.terms}` : null,
        ])
      ),
      url: `/customers`,
    };
  },
  async listIds() {
    return (await db.customerContract.findMany({ select: { id: true } })).map((r) => r.id);
  },
};

const complianceEntry: EntityRegistryEntry = {
  entityType: "compliance",
  permission: "knowledge.read",
  contextRoute: "/compliance",
  detailPath: (id) => `/compliance?open=${id}`,
  async fetchById(id) {
    return db.complianceItem.findFirst({ where: { id, deletedAt: null } });
  },
  serialize(record) {
    const r = record as {
      title: string;
      description?: string | null;
      category: string;
      status: string;
      riskRating: string;
      deadline?: Date | null;
      evidence?: string | null;
    };
    if (!r?.title) return null;
    return {
      title: r.title,
      body: truncate(
        joinParts([
          `Category: ${r.category}`,
          `Status: ${r.status}`,
          `Risk: ${r.riskRating}`,
          r.deadline ? `Deadline: ${r.deadline.toISOString().slice(0, 10)}` : null,
          r.description,
          r.evidence ? `Evidence: ${r.evidence}` : null,
        ])
      ),
      url: `/compliance`,
    };
  },
  async listIds() {
    return (await db.complianceItem.findMany({ where: { deletedAt: null }, select: { id: true } })).map((r) => r.id);
  },
};

const riskEntry: EntityRegistryEntry = {
  entityType: "risk",
  permission: "knowledge.read",
  contextRoute: "/risks",
  detailPath: (id) => `/risks?open=${id}`,
  async fetchById(id) {
    return db.risk.findFirst({ where: { id, deletedAt: null } });
  },
  serialize(record) {
    const r = record as {
      title: string;
      description?: string | null;
      category: string;
      level: string;
      mitigation?: string | null;
      reviewDate?: Date | null;
    };
    if (!r?.title) return null;
    return {
      title: r.title,
      body: truncate(
        joinParts([
          `Category: ${r.category}`,
          `Level: ${r.level}`,
          r.reviewDate ? `Review: ${r.reviewDate.toISOString().slice(0, 10)}` : null,
          r.description,
          r.mitigation ? `Mitigation: ${r.mitigation}` : null,
        ])
      ),
      url: `/risks`,
    };
  },
  async listIds() {
    return (await db.risk.findMany({ where: { deletedAt: null }, select: { id: true } })).map((r) => r.id);
  },
};

const securityIncidentEntry: EntityRegistryEntry = {
  entityType: "security_incident",
  permission: "knowledge.read",
  contextRoute: "/risks",
  detailPath: () => `/risks`,
  async fetchById(id) {
    return db.securityIncident.findFirst({ where: { id, deletedAt: null } });
  },
  serialize(record) {
    const r = record as { title: string; description?: string | null; severity: string; status: string };
    if (!r?.title) return null;
    return {
      title: r.title,
      body: truncate(joinParts([`Severity: ${r.severity}`, `Status: ${r.status}`, r.description])),
      url: `/risks`,
    };
  },
  async listIds() {
    return (await db.securityIncident.findMany({ where: { deletedAt: null }, select: { id: true } })).map((r) => r.id);
  },
};

const competitorEntry: EntityRegistryEntry = {
  entityType: "competitor",
  permission: "knowledge.read",
  contextRoute: "/products",
  detailPath: () => `/products`,
  async fetchById(id) {
    return db.competitor.findFirst({ where: { id, deletedAt: null } });
  },
  serialize(record) {
    const r = record as {
      name: string;
      website?: string | null;
      description?: string | null;
      pricing?: string | null;
      features?: string | null;
      notes?: string | null;
    };
    if (!r?.name) return null;
    return {
      title: `Competitor: ${r.name}`,
      body: truncate(joinParts([r.website, r.description, r.pricing, r.features, r.notes])),
      url: `/products`,
    };
  },
  async listIds() {
    return (await db.competitor.findMany({ where: { deletedAt: null }, select: { id: true } })).map((r) => r.id);
  },
};

const apiRegistryEntry: EntityRegistryEntry = {
  entityType: "api_registry",
  permission: "knowledge.read",
  contextRoute: "/products",
  detailPath: () => `/products`,
  async fetchById(id) {
    return db.apiRegistryEntry.findFirst({ where: { id, deletedAt: null } });
  },
  serialize(record) {
    const r = record as {
      name: string;
      provider?: string | null;
      baseUrl?: string | null;
      authType?: string | null;
      rateLimits?: string | null;
      pricing?: string | null;
      docs?: string | null;
      risks?: string | null;
    };
    if (!r?.name) return null;
    return {
      title: `API: ${r.name}`,
      body: truncate(joinParts([r.provider, r.baseUrl, r.authType, r.rateLimits, r.pricing, r.docs, r.risks])),
      url: `/products`,
    };
  },
  async listIds() {
    return (await db.apiRegistryEntry.findMany({ where: { deletedAt: null }, select: { id: true } })).map((r) => r.id);
  },
};

const revenueEntryDef: EntityRegistryEntry = {
  entityType: "revenue_entry",
  permission: "knowledge.read",
  contextRoute: "/revenue",
  detailPath: () => `/revenue`,
  async fetchById(id) {
    return db.revenueEntry.findFirst({
      where: { id, deletedAt: null },
      include: { product: true, customer: { include: { alias: true } } },
    });
  },
  serialize(record) {
    const r = record as {
      amount: unknown;
      currency: string;
      type: string;
      description?: string | null;
      status: string;
      recordedAt: Date;
      product?: { name: string } | null;
      customer?: { industry?: string | null; alias?: { alias: string } | null } | null;
    };
    if (!r) return null;
    const alias = r.customer?.alias?.alias ?? (r.customer ? generateDefaultAlias(r.customer.industry) : "No customer");
    return {
      title: `Revenue ${r.type} — ${Number(r.amount).toLocaleString()} ${r.currency}`,
      body: truncate(
        joinParts([
          `Customer alias: ${alias}`,
          `Status: ${r.status}`,
          `Recorded: ${r.recordedAt.toISOString().slice(0, 10)}`,
          r.product ? `Product: ${r.product.name}` : null,
          r.description,
        ])
      ),
      url: `/revenue`,
    };
  },
  async listIds() {
    return (await db.revenueEntry.findMany({ where: { deletedAt: null }, select: { id: true } })).map((r) => r.id);
  },
};

const expenseEntry: EntityRegistryEntry = {
  entityType: "expense",
  permission: "knowledge.read",
  contextRoute: "/revenue",
  detailPath: () => `/revenue`,
  async fetchById(id) {
    return db.expense.findFirst({ where: { id, deletedAt: null } });
  },
  serialize(record) {
    const r = record as {
      amount: unknown;
      currency: string;
      category: string;
      description?: string | null;
      recordedAt: Date;
    };
    if (!r) return null;
    return {
      title: `Expense ${r.category} — ${Number(r.amount).toLocaleString()} ${r.currency}`,
      body: truncate(joinParts([`Recorded: ${r.recordedAt.toISOString().slice(0, 10)}`, r.description])),
      url: `/revenue`,
    };
  },
  async listIds() {
    return (await db.expense.findMany({ where: { deletedAt: null }, select: { id: true } })).map((r) => r.id);
  },
};

const salesDealEntry: EntityRegistryEntry = {
  entityType: "sales_deal",
  permission: "knowledge.read",
  contextRoute: "/revenue",
  detailPath: () => `/revenue`,
  async fetchById(id) {
    return db.salesDeal.findFirst({
      where: { id, deletedAt: null },
      include: { customer: { include: { alias: true } }, product: true },
    });
  },
  serialize(record) {
    const r = record as {
      stage: string;
      expectedValue: unknown;
      probabilityPercent: number;
      expectedCloseDate?: Date | null;
      customer: { industry?: string | null; alias?: { alias: string } | null };
      product?: { name: string } | null;
    };
    if (!r) return null;
    const alias = r.customer.alias?.alias ?? generateDefaultAlias(r.customer.industry);
    return {
      title: `Deal ${alias} — ${r.stage}`,
      body: truncate(
        joinParts([
          `Customer alias: ${alias}`,
          `Expected value: ${Number(r.expectedValue).toLocaleString()}`,
          `Probability: ${r.probabilityPercent}%`,
          r.expectedCloseDate ? `Close: ${r.expectedCloseDate.toISOString().slice(0, 10)}` : null,
          r.product ? `Product: ${r.product.name}` : null,
        ])
      ),
      url: `/revenue`,
    };
  },
  async listIds() {
    return (await db.salesDeal.findMany({ where: { deletedAt: null }, select: { id: true } })).map((r) => r.id);
  },
};

const knowledgeSourceEntry: EntityRegistryEntry = {
  entityType: "knowledge_source",
  permission: "knowledge.read",
  contextRoute: "/knowledge",
  detailPath: () => `/knowledge`,
  async fetchById(id) {
    return db.knowledgeSource.findFirst({ where: { id, deletedAt: null } });
  },
  serialize(record) {
    const r = record as {
      name: string;
      category?: string | null;
      sourceType: string;
      url?: string | null;
      approved: boolean;
      riskLevel: string;
    };
    if (!r?.name) return null;
    return {
      title: `Source: ${r.name}`,
      body: truncate(
        joinParts([
          `Type: ${r.sourceType}`,
          r.category ? `Category: ${r.category}` : null,
          `Approved: ${r.approved}`,
          `Risk: ${r.riskLevel}`,
          r.url,
        ])
      ),
      url: `/knowledge`,
    };
  },
  async listIds() {
    return (await db.knowledgeSource.findMany({ where: { deletedAt: null }, select: { id: true } })).map((r) => r.id);
  },
};

export const ENTITY_REGISTRY: Record<RagEntityType, EntityRegistryEntry> = {
  knowledge: knowledgeEntry,
  research: researchEntry,
  journal: journalEntry,
  decision: decisionEntry,
  meeting: meetingEntry,
  idea: ideaEntry,
  product: productEntry,
  product_release: productReleaseEntry,
  customer: customerEntry,
  customer_contract: customerContractEntry,
  compliance: complianceEntry,
  risk: riskEntry,
  security_incident: securityIncidentEntry,
  competitor: competitorEntry,
  api_registry: apiRegistryEntry,
  revenue_entry: revenueEntryDef,
  expense: expenseEntry,
  sales_deal: salesDealEntry,
  knowledge_source: knowledgeSourceEntry,
};

export function getRegistryEntry(entityType: RagEntityType): EntityRegistryEntry {
  return ENTITY_REGISTRY[entityType];
}

export function isRagEntityType(value: string): value is RagEntityType {
  return (RAG_ENTITY_TYPES as readonly string[]).includes(value);
}

const SENSITIVE_ROLES: UserRole[] = ["FOUNDER", "ADMINISTRATOR", "DEVELOPER"];

export async function canIndexJournal(record: unknown): Promise<boolean> {
  const r = record as { visibility?: DataClassification };
  if (!r.visibility || r.visibility === "PUBLIC" || r.visibility === "INTERNAL") return true;
  return false;
}

export function canRetrieveJournal(visibility: DataClassification, role: UserRole): boolean {
  if (visibility === "PUBLIC" || visibility === "INTERNAL") return true;
  return SENSITIVE_ROLES.includes(role);
}
