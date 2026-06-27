import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { getClientIp } from "@/lib/api/helpers";
import { auditLog, recordEvent } from "@/lib/logger/audit";

export const POST = withAuth(async (request, { user }) => {
  await recordEvent({ eventType: "job.reindex", actorId: user.id, severity: "INFO" });
  await auditLog({ userId: user.id, action: "job.reindex", resource: "jobs", ipAddress: getClientIp(request) });
  return success({ status: "queued" }, "Reindex job queued.");
}, "admin.access");
