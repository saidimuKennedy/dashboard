import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody } from "@/lib/api/helpers";
import { createCashSnapshotSchema } from "@/lib/validations/revenue";
import { financeRepository } from "@/server/repositories/finance.repository";

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, createCashSnapshotSchema);
  if (!parsed.ok) return parsed.response;
  const snapshot = await financeRepository.createCashSnapshot(parsed.data, user.id);
  return success(snapshot, "Cash snapshot saved.", 201);
}, "revenue.manage");
