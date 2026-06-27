import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody } from "@/lib/api/helpers";
import { aiRequestSchema } from "@/lib/validations";

export const POST = withAuth(async (request) => {
  const parsed = await parseBody(request, aiRequestSchema);
  if (!parsed.ok) return parsed.response;
  return success({ status: "queued", dimensions: 1536, text: parsed.data.prompt.slice(0, 100) });
}, "ai.use");
