import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody } from "@/lib/api/helpers";
import { contractSettingsSchema } from "@/lib/validations";
import { contractSettingsRepository } from "@/server/repositories/dashboard.repository";

export const GET = withAuth(async () => {
  const settings = await contractSettingsRepository.get();
  return success(settings);
}, "customer.manage");

export const PUT = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, contractSettingsSchema);
  if (!parsed.ok) return parsed.response;
  await contractSettingsRepository.update(parsed.data, user.id);
  return success(parsed.data, "Contract settings saved.");
}, "customer.manage");
