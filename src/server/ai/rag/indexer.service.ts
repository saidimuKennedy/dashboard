import { db } from "@/lib/db";
import { generateEmbedding, vectorToSqlLiteral } from "@/server/ai/rag/embedding.provider";
import {
  ENTITY_REGISTRY,
  canIndexJournal,
  getRegistryEntry,
  isRagEntityType,
} from "@/server/ai/rag/entity-registry";
import { formatIndexedContent, type RagEntityType } from "@/server/ai/rag/types";

export const ragIndexer = {
  async indexEntity(entityType: RagEntityType, entityId: string): Promise<boolean> {
    const entry = getRegistryEntry(entityType);
    const record = await entry.fetchById(entityId);
    if (!record) {
      await this.removeEntity(entityType, entityId);
      return false;
    }

    if (entityType === "journal" && !(await canIndexJournal(record))) {
      await this.removeEntity(entityType, entityId);
      return false;
    }

    const doc = entry.serialize(record);
    if (!doc) {
      await this.removeEntity(entityType, entityId);
      return false;
    }

    const content = formatIndexedContent(doc);
    const embedding = await generateEmbedding(content);

    const existing = await db.embedding.findUnique({
      where: { entityType_entityId: { entityType, entityId } },
    });

    if (existing) {
      await db.embedding.update({
        where: { id: existing.id },
        data: { content },
      });
      if (embedding) {
        await db.$executeRawUnsafe(
          `UPDATE embeddings SET vector = $1::vector, updated_at = NOW() WHERE id = $2`,
          vectorToSqlLiteral(embedding),
          existing.id
        );
      }
    } else {
      const created = await db.embedding.create({
        data: { entityType, entityId, content },
      });
      if (embedding) {
        await db.$executeRawUnsafe(
          `UPDATE embeddings SET vector = $1::vector, updated_at = NOW() WHERE id = $2`,
          vectorToSqlLiteral(embedding),
          created.id
        );
      }
    }

    return true;
  },

  async removeEntity(entityType: RagEntityType, entityId: string): Promise<void> {
    await db.embedding
      .delete({
        where: { entityType_entityId: { entityType, entityId } },
      })
      .catch(() => undefined);
  },

  async reindexAll(entityType?: RagEntityType): Promise<{ indexed: number; failed: number }> {
    const types = entityType ? [entityType] : (Object.keys(ENTITY_REGISTRY) as RagEntityType[]);
    let indexed = 0;
    let failed = 0;

    for (const type of types) {
      const ids = await getRegistryEntry(type).listIds();
      for (const id of ids) {
        try {
          const ok = await this.indexEntity(type, id);
          if (ok) indexed += 1;
        } catch {
          failed += 1;
        }
      }
    }

    return { indexed, failed };
  },

  async reindexMissingVectors(batchSize = 50): Promise<{ updated: number }> {
    const rows = await db.$queryRawUnsafe<{ id: string; content: string }[]>(
      `SELECT id, content FROM embeddings WHERE vector IS NULL LIMIT $1`,
      batchSize
    );

    let updated = 0;
    for (const row of rows) {
      const embedding = await generateEmbedding(row.content);
      if (!embedding) continue;
      await db.$executeRawUnsafe(
        `UPDATE embeddings SET vector = $1::vector, updated_at = NOW() WHERE id = $2`,
        vectorToSqlLiteral(embedding),
        row.id
      );
      updated += 1;
    }

    return { updated };
  },
};

export function scheduleRagIndex(entityType: RagEntityType | string, entityId: string): void {
  if (!isRagEntityType(entityType)) return;
  void ragIndexer.indexEntity(entityType, entityId).catch((err) => {
    console.error(`[rag] index failed ${entityType}:${entityId}`, err);
  });
}

export function scheduleRagRemove(entityType: RagEntityType | string, entityId: string): void {
  if (!isRagEntityType(entityType)) return;
  void ragIndexer.removeEntity(entityType, entityId).catch((err) => {
    console.error(`[rag] remove failed ${entityType}:${entityId}`, err);
  });
}
