import { db } from "@/lib/db";
import type { UserRole } from "@prisma/client";
import { ragRetrieval, type RetrievedSource } from "@/server/ai/rag/retrieval.service";
import { getRegistryEntry, isRagEntityType } from "@/server/ai/rag/entity-registry";
import { formatIndexedContent, type RagEntityType } from "@/server/ai/rag/types";

export type ChatContextInput = {
  prompt: string;
  contextKey?: string;
  extraContext?: string[];
  userRole: UserRole;
  userId?: string;
};

export type BuiltChatContext = {
  contextBlock: string;
  sources: RetrievedSource[];
};

function parseOpenId(contextKey?: string): { path: string; openId?: string } {
  if (!contextKey) return { path: "" };
  const [path, query] = contextKey.split("?");
  if (!query) return { path };
  const params = new URLSearchParams(query);
  return { path, openId: params.get("open") ?? undefined };
}

async function buildMeetingChatContext(contextKey: string): Promise<string | null> {
  const { path, openId } = parseOpenId(contextKey);
  const parts = path.split("/").filter(Boolean);
  if (parts[0] !== "meetings") return null;

  const meetingId = openId ?? (parts[1] || undefined);

  if (meetingId) {
    const meeting = await db.meeting.findFirst({
      where: { id: meetingId, deletedAt: null },
      include: {
        customer: { include: { alias: true } },
        actionItems: { where: { deletedAt: null } },
      },
    });
    if (!meeting) return null;

    const customerLabel = meeting.customer?.alias?.alias ?? "Unlinked customer";

    return [
      `Meeting: ${meeting.title}`,
      meeting.scheduledAt ? `Scheduled: ${meeting.scheduledAt.toISOString()}` : "",
      meeting.type ? `Type: ${meeting.type}` : "",
      meeting.status ? `Status: ${meeting.status}` : "",
      meeting.outcome ? `Outcome: ${meeting.outcome}` : "",
      `Customer: ${customerLabel}`,
      meeting.agenda ? `Agenda:\n${meeting.agenda}` : "",
      meeting.outcomeReport ? `Outcome report:\n${meeting.outcomeReport}` : "",
      meeting.minutes ? `Minutes:\n${meeting.minutes}` : "",
      meeting.aiSummary ? `AI summary:\n${meeting.aiSummary}` : "",
      meeting.aiEvaluation ? `AI evaluation:\n${meeting.aiEvaluation}` : "",
      meeting.actionItems.length
        ? `Action items:\n${meeting.actionItems.map((a) => `- ${a.title}${a.completed ? " (done)" : ""}`).join("\n")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  const upcoming = await db.meeting.findMany({
    where: { deletedAt: null, status: "SCHEDULED", scheduledAt: { gte: new Date() } },
    take: 5,
    orderBy: { scheduledAt: "asc" },
    select: { title: true, scheduledAt: true, type: true, outcome: true },
  });

  const recent = await db.meeting.findMany({
    where: { deletedAt: null, status: "COMPLETED" },
    take: 5,
    orderBy: { scheduledAt: "desc" },
    select: { title: true, scheduledAt: true, outcome: true, aiSummary: true },
  });

  return [
    "Upcoming meetings:",
    upcoming.length
      ? upcoming
          .map((m) => `- ${m.title} (${m.scheduledAt?.toISOString() ?? "unscheduled"}, ${m.type})`)
          .join("\n")
      : "None scheduled.",
    "Recent completed meetings:",
    recent.length
      ? recent
          .map(
            (m) =>
              `- ${m.title} (${m.outcome})${m.aiSummary ? `: ${m.aiSummary.slice(0, 120)}` : ""}`
          )
          .join("\n")
      : "None completed yet.",
  ].join("\n\n");
}

const DETAIL_ENTITY_BY_PATH: Record<string, RagEntityType> = {
  "/research": "research",
  "/journal": "journal",
  "/decisions": "decision",
  "/knowledge": "knowledge",
  "/compliance": "compliance",
  "/risks": "risk",
  "/products": "product",
  "/customers": "customer",
};

async function buildDetailContext(contextKey: string): Promise<string | null> {
  const { path, openId } = parseOpenId(contextKey);
  if (!openId) return null;

  const entityType = DETAIL_ENTITY_BY_PATH[path];
  if (!entityType || !isRagEntityType(entityType)) return null;

  const entry = getRegistryEntry(entityType);
  const record = await entry.fetchById(openId);
  if (!record) return null;

  const doc = entry.serialize(record);
  if (!doc) return null;

  return `Current ${entityType} record:\n${formatIndexedContent(doc)}`;
}

async function buildCustomerDetailContext(contextKey: string): Promise<string | null> {
  const parts = contextKey.split("/").filter(Boolean);
  if (parts[0] !== "customers" || !parts[1] || parts[1].includes("?")) return null;

  const entry = getRegistryEntry("customer");
  const record = await entry.fetchById(parts[1]);
  if (!record) return null;
  const doc = entry.serialize(record);
  if (!doc) return null;
  return `Current customer record:\n${formatIndexedContent(doc)}`;
}

export async function buildChatContext(input: ChatContextInput): Promise<BuiltChatContext> {
  const extraContext: string[] = [...(input.extraContext ?? [])];

  if (input.contextKey === "/revenue") {
    const { getRevenueFactsForAgent } = await import("@/lib/finance/reports");
    extraContext.push(await getRevenueFactsForAgent());
  }

  if (input.contextKey?.startsWith("/meetings")) {
    const meetingContext = await buildMeetingChatContext(input.contextKey);
    if (meetingContext) extraContext.push(meetingContext);
  }

  if (input.contextKey?.startsWith("/customers/")) {
    const customerContext = await buildCustomerDetailContext(input.contextKey);
    if (customerContext) extraContext.push(customerContext);
  } else {
    const detailContext = input.contextKey ? await buildDetailContext(input.contextKey) : null;
    if (detailContext) extraContext.push(detailContext);
  }

  const sources = await ragRetrieval.hybridSearch(input.prompt, {
    limit: 8,
    userRole: input.userRole,
    contextKey: input.contextKey,
    userId: input.userId,
  });

  const ragLines = sources.map((s) => `[${s.type}/${s.title}]: ${s.excerpt}`);
  const contextBlock = [...extraContext, ...ragLines].join("\n");

  return { contextBlock, sources };
}

export async function buildFounderBriefContext(userRole: UserRole): Promise<string> {
  const sources = await ragRetrieval.hybridSearch(
    "priorities risks opportunities compliance revenue meetings decisions research",
    { limit: 12, userRole, contextKey: "/dashboard" }
  );

  const { getRevenueFactsForAgent } = await import("@/lib/finance/reports");
  const revenueFacts = await getRevenueFactsForAgent();

  const [highRisks, complianceIssues, recentMeetings] = await Promise.all([
    db.risk.count({ where: { deletedAt: null, level: { in: ["HIGH", "CRITICAL"] } } }),
    db.complianceItem.count({ where: { deletedAt: null, status: { in: ["AT_RISK", "NON_COMPLIANT"] } } }),
    db.meeting.count({ where: { deletedAt: null, createdAt: { gte: new Date(Date.now() - 86400000) } } }),
  ]);

  return [
    `High/critical risks: ${highRisks}`,
    `Compliance issues: ${complianceIssues}`,
    `Meetings in last 24h: ${recentMeetings}`,
    revenueFacts,
    "Recent indexed highlights:",
    ...sources.map((s) => `- [${s.type}] ${s.title}: ${s.excerpt.slice(0, 160)}`),
  ].join("\n");
}
