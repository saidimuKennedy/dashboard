import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { runJobSchema } from "@/lib/validations";
import { auditLog, recordEvent } from "@/lib/logger/audit";

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, runJobSchema);
  if (!parsed.ok) return parsed.response;
  await recordEvent({ eventType: `job.${parsed.data.job}`, actorId: user.id, metadata: parsed.data.params, severity: "INFO" });
  await auditLog({ userId: user.id, action: `job.run.${parsed.data.job}`, resource: "jobs", ipAddress: getClientIp(request), metadata: parsed.data.params });
  return success({ job: parsed.data.job, status: "queued" }, `Job ${parsed.data.job} queued.`);
}, "admin.access");
