import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

type AuditParams = {
  userId?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
};

export async function auditLog(params: AuditParams) {
  await db.auditLog.create({
    data: {
      userId: params.userId ?? undefined,
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId ?? undefined,
      metadata: params.metadata as Prisma.InputJsonValue | undefined,
      ipAddress: params.ipAddress ?? undefined,
    },
  });
}

export async function recordEvent(params: {
  eventType: string;
  actorId?: string | null;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  source?: string;
  severity?: "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}) {
  await db.event.create({
    data: {
      eventType: params.eventType,
      actorId: params.actorId ?? undefined,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: params.metadata as Prisma.InputJsonValue | undefined,
      source: params.source ?? "api",
      severity: params.severity ?? "INFO",
    },
  });
}
