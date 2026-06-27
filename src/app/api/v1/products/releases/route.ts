import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { productReleaseSchema } from "@/lib/validations";
import { auditLog } from "@/lib/logger/audit";
import { db } from "@/lib/db";

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, productReleaseSchema);
  if (!parsed.ok) return parsed.response;
  const release = await db.productRelease.create({ data: parsed.data });
  await auditLog({ userId: user.id, action: "product.release", resource: "products", resourceId: parsed.data.productId, ipAddress: getClientIp(request) });
  return success(release, "Release recorded.", 201);
});
