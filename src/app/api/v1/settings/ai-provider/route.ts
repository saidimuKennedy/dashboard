import { withAuth } from "@/lib/api/middleware";
import { success, error } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { connectAiProviderSchema } from "@/lib/validations/settings";
import {
  getDeepSeekApiKey,
  maskApiKey,
  saveDeepSeekApiKey,
  validateDeepSeekApiKey,
} from "@/lib/ai/deepseek";
import { auditLog } from "@/lib/logger/audit";

export const GET = withAuth(async () => {
  const apiKey = await getDeepSeekApiKey();
  return success({
    configured: Boolean(apiKey),
    maskedKey: apiKey ? maskApiKey(apiKey) : null,
  });
}, "ai.use");

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, connectAiProviderSchema);
  if (!parsed.ok) return parsed.response;

  const { apiKey } = parsed.data;
  const validation = await validateDeepSeekApiKey(apiKey);

  if (!validation.valid) {
    return error(validation.message, "PROVIDER_REJECTED", 400);
  }

  await saveDeepSeekApiKey(apiKey, user.id);
  await auditLog({
    userId: user.id,
    action: "ai.provider.connect",
    resource: "settings",
    ipAddress: getClientIp(request),
  });

  return success(
    { configured: true, maskedKey: maskApiKey(apiKey) },
    validation.message
  );
}, "ai.use");
