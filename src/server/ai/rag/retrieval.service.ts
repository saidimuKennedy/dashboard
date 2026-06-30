import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import type { UserRole } from "@prisma/client";
import {
  ENTITY_REGISTRY,
  canRetrieveJournal,
  getRegistryEntry,
} from "@/server/ai/rag/entity-registry";
import { generateEmbedding, vectorToSqlLiteral } from "@/server/ai/rag/embedding.provider";
import {
  CONTEXT_KEY_BOOST,
  excerptFromContent,
  contextKeyToBoostTypes,
  type RagEntityType,
  type RagSearchOptions,
  type RetrievedSource,
} from "@/server/ai/rag/types";

type ScoredHit = {
  entityType: RagEntityType;
  entityId: string;
  content: string;
  score: number;
};

function queryTerms(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 2)
    .slice(0, 8);
}

function allowedEntityTypes(role: UserRole): RagEntityType[] {
  return (Object.keys(ENTITY_REGISTRY) as RagEntityType[]).filter((entityType) => {
    const permission = getRegistryEntry(entityType).permission;
    return hasPermission(role, permission);
  });
}

async function filterHits(hits: ScoredHit[], role: UserRole): Promise<ScoredHit[]> {
  const filtered: ScoredHit[] = [];

  for (const hit of hits) {
    if (!allowedEntityTypes(role).includes(hit.entityType)) continue;

    if (hit.entityType === "journal") {
      const journal = await db.journalEntry.findFirst({
        where: { id: hit.entityId, deletedAt: null },
        select: { visibility: true },
      });
      if (!journal || !canRetrieveJournal(journal.visibility, role)) continue;
    }

    filtered.push(hit);
  }

  return filtered;
}

async function keywordSearch(query: string, limit: number): Promise<ScoredHit[]> {
  const terms = queryTerms(query);
  if (!terms.length) {
    const rows = await db.embedding.findMany({
      orderBy: { updatedAt: "desc" },
      take: limit,
    });
    return rows.map((row) => ({
      entityType: row.entityType as RagEntityType,
      entityId: row.entityId,
      content: row.content,
      score: 0.1,
    }));
  }

  const rows = await db.embedding.findMany({
    where: {
      OR: terms.map((term) => ({ content: { contains: term, mode: "insensitive" as const } })),
    },
    take: limit * 4,
    orderBy: { updatedAt: "desc" },
  });

  const scored = rows.map((row) => {
    const lower = row.content.toLowerCase();
    const hits = terms.filter((term) => lower.includes(term)).length;
    return {
      entityType: row.entityType as RagEntityType,
      entityId: row.entityId,
      content: row.content,
      score: hits / terms.length,
    };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, limit * 2);
}

async function vectorSearch(query: string, limit: number): Promise<ScoredHit[]> {
  const embedding = await generateEmbedding(query);
  if (!embedding) return [];

  try {
    const rows = await db.$queryRawUnsafe<
      { entity_type: string; entity_id: string; content: string; score: number }[]
    >(
      `SELECT entity_type, entity_id, content, 1 - (vector <=> $1::vector) AS score
       FROM embeddings
       WHERE vector IS NOT NULL
       ORDER BY vector <=> $1::vector
       LIMIT $2`,
      vectorToSqlLiteral(embedding),
      limit * 2
    );

    return rows.map((row) => ({
      entityType: row.entity_type as RagEntityType,
      entityId: row.entity_id,
      content: row.content,
      score: Number(row.score),
    }));
  } catch {
    return [];
  }
}

function mergeHits(keyword: ScoredHit[], vector: ScoredHit[], boostTypes: RagEntityType[]): ScoredHit[] {
  const map = new Map<string, ScoredHit>();

  for (const hit of keyword) {
    const key = `${hit.entityType}:${hit.entityId}`;
    map.set(key, { ...hit, score: hit.score * 0.6 });
  }

  for (const hit of vector) {
    const key = `${hit.entityType}:${hit.entityId}`;
    const existing = map.get(key);
    if (existing) {
      existing.score = existing.score + hit.score * 0.4;
    } else {
      map.set(key, { ...hit, score: hit.score * 0.4 });
    }
  }

  for (const hit of map.values()) {
    if (boostTypes.includes(hit.entityType)) {
      hit.score += CONTEXT_KEY_BOOST;
    }
  }

  return [...map.values()].sort((a, b) => b.score - a.score);
}

function toRetrievedSource(hit: ScoredHit): RetrievedSource {
  const entry = getRegistryEntry(hit.entityType);
  const title = hit.content.split("\n")[0] ?? hit.entityType;
  return {
    id: hit.entityId,
    title,
    type: hit.entityType,
    excerpt: excerptFromContent(hit.content),
    score: hit.score,
    url: entry.detailPath(hit.entityId),
  };
}

export const ragRetrieval = {
  async hybridSearch(query: string, options: RagSearchOptions): Promise<RetrievedSource[]> {
    const limit = options.limit ?? 8;
    const boostTypes = contextKeyToBoostTypes(options.contextKey);

    const [keywordHits, vectorHits] = await Promise.all([
      keywordSearch(query, limit),
      vectorSearch(query, limit),
    ]);

    const merged = mergeHits(keywordHits, vectorHits, boostTypes);
    const filtered = await filterHits(merged, options.userRole);
    const results = filtered.slice(0, limit).map(toRetrievedSource);

    if (options.userId) {
      void db.searchLog
        .create({
          data: {
            userId: options.userId,
            query,
            type: "rag",
            results: results.length,
          },
        })
        .catch(() => undefined);
    }

    return results;
  },
};

export type { RetrievedSource };
