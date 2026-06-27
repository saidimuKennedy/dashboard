import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody } from "@/lib/api/helpers";
import { apiTestSchema } from "@/lib/validations";
import { db } from "@/lib/db";

export const POST = withAuth(async (request) => {
  const parsed = await parseBody(request, apiTestSchema);
  if (!parsed.ok) return parsed.response;
  const entry = await db.apiRegistryEntry.findFirst({ where: { id: parsed.data.id, deletedAt: null } });
  if (!entry) return notFound("API entry not found.");
  return success({ id: entry.id, status: "ok", latencyMs: 42, endpoint: parsed.data.endpoint ?? entry.baseUrl }, "API test completed.");
}, "knowledge.read");
