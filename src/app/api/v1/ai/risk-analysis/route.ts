import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody } from "@/lib/api/helpers";
import { aiRequestSchema } from "@/lib/validations";
import { aiService } from "@/server/ai/ai.service";
import { riskRepository } from "@/server/repositories/domains.repository";

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, aiRequestSchema);
  if (!parsed.ok) return parsed.response;
  const { items } = await riskRepository.list(0, 10);
  const result = await aiService.chat(user.id, {
    prompt: `${parsed.data.prompt}\n\nCurrent risks: ${JSON.stringify(items.map((r: { title: string; level: string }) => ({ title: r.title, level: r.level })))}`,
    persona: "compliance_advisor",
  });
  return success(result);
}, "ai.use");
