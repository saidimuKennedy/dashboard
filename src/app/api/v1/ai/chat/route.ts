import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody } from "@/lib/api/helpers";
import { aiRequestSchema } from "@/lib/validations";
import { aiService } from "@/server/ai/ai.service";

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, aiRequestSchema);
  if (!parsed.ok) return parsed.response;
  const result = await aiService.chat(user.id, { ...parsed.data, userRole: user.role });
  return success(result);
}, "ai.use");
