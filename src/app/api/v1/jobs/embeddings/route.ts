import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { getClientIp } from "@/lib/api/helpers";
import { auditLog, recordEvent } from "@/lib/logger/audit";
import { ragIndexer } from "@/server/ai/rag/indexer.service";

export const POST = withAuth(async (request, { user }) => {
  const vectors = await ragIndexer.reindexMissingVectors(100);
  await recordEvent({
    eventType: "job.embeddings",
    actorId: user.id,
    severity: "INFO",
    metadata: vectors,
  });
  await auditLog({
    userId: user.id,
    action: "job.embeddings",
    resource: "jobs",
    ipAddress: getClientIp(request),
    metadata: vectors,
  });
  return success({ status: "completed", ...vectors }, "Embeddings job completed.");
}, "admin.access");
