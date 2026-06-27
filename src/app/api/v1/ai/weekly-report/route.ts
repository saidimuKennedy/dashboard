import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { aiService } from "@/server/ai/ai.service";

export const POST = withAuth(async (_request, { user }) => {
  const result = await aiService.chat(user.id, { prompt: "Generate weekly executive report.", persona: "founder_brief" });
  return success(result);
}, "ai.use");
