import type { UserRole } from "@prisma/client";
import type { Permission } from "@/lib/permissions";

export const RAG_ENTITY_TYPES = [
  "knowledge",
  "research",
  "journal",
  "decision",
  "meeting",
  "idea",
  "product",
  "product_release",
  "customer",
  "customer_contract",
  "compliance",
  "risk",
  "security_incident",
  "competitor",
  "api_registry",
  "revenue_entry",
  "expense",
  "sales_deal",
  "knowledge_source",
] as const;

export type RagEntityType = (typeof RAG_ENTITY_TYPES)[number];

export type SerializedDocument = {
  title: string;
  body: string;
  url?: string;
};

export type RetrievedSource = {
  id: string;
  title: string;
  type: RagEntityType;
  excerpt: string;
  score: number;
  url?: string;
};

export type RagSearchOptions = {
  limit?: number;
  userRole: UserRole;
  contextKey?: string;
  userId?: string;
};

export type EntityRegistryEntry = {
  entityType: RagEntityType;
  permission: Permission;
  contextRoute?: string;
  detailPath: (id: string) => string;
  fetchById: (id: string) => Promise<unknown | null>;
  serialize: (record: unknown) => SerializedDocument | null;
  listIds: () => Promise<string[]>;
};

export const MAX_INDEX_CONTENT_LENGTH = 8000;
export const CONTEXT_KEY_BOOST = 0.15;

export function contextKeyToBoostTypes(contextKey?: string): RagEntityType[] {
  if (!contextKey) return [];
  const path = contextKey.split("?")[0];
  const map: Record<string, RagEntityType[]> = {
    "/knowledge": ["knowledge", "knowledge_source"],
    "/research": ["research"],
    "/journal": ["journal"],
    "/decisions": ["decision"],
    "/meetings": ["meeting"],
    "/customers": ["customer", "customer_contract", "sales_deal"],
    "/revenue": ["revenue_entry", "expense", "sales_deal"],
    "/products": ["product", "product_release", "idea"],
    "/compliance": ["compliance"],
    "/risks": ["risk", "security_incident"],
  };
  if (path.startsWith("/customers/")) return ["customer", "customer_contract"];
  if (path.startsWith("/meetings/")) return ["meeting"];
  return map[path] ?? [];
}

export function formatIndexedContent(doc: SerializedDocument): string {
  return `${doc.title}\n\n${doc.body}`.slice(0, MAX_INDEX_CONTENT_LENGTH);
}

export function excerptFromContent(content: string, max = 240): string {
  const body = content.includes("\n\n") ? content.slice(content.indexOf("\n\n") + 2) : content;
  return body.slice(0, max).trim();
}
