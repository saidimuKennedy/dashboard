import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { customerFeedbackSchema } from "@/lib/validations";
import { auditLog } from "@/lib/logger/audit";
import { db } from "@/lib/db";

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, customerFeedbackSchema);
  if (!parsed.ok) return parsed.response;
  const feedback = await db.customerFeedback.create({ data: parsed.data });
  await auditLog({ userId: user.id, action: "customer.feedback", resource: "customers", resourceId: parsed.data.customerId, ipAddress: getClientIp(request) });
  return success(feedback, "Feedback recorded.", 201);
}, "customer.manage");
