import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { aiService } from "@/server/ai/ai.service";

export const POST = withAuth(async () => {
  const result = await aiService.founderBrief();
  return success(result);
}, "ai.use");
