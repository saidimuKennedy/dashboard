import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { getClientIp } from "@/lib/api/helpers";
import { auditLog, recordEvent } from "@/lib/logger/audit";
import { ragIndexer } from "@/server/ai/rag/indexer.service";

export const POST = withAuth(async (request, { user }) => {
  const result = await ragIndexer.reindexAll();
  await recordEvent({
    eventType: "job.reindex",
    actorId: user.id,
    severity: "INFO",
    metadata: result,
  });
  await auditLog({
    userId: user.id,
    action: "job.reindex",
    resource: "jobs",
    ipAddress: getClientIp(request),
    metadata: result,
  });
  return success({ status: "completed", ...result }, "Reindex job completed.");
}, "admin.access");
