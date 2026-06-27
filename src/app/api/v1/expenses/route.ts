import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { createExpenseSchema } from "@/lib/validations/revenue";
import { financeRepository } from "@/server/repositories/finance.repository";
import { auditLog } from "@/lib/logger/audit";

export const POST = withAuth(async (request) => {
  const parsed = await parseBody(request, createExpenseSchema);
  if (!parsed.ok) return parsed.response;
  const entry = await financeRepository.createExpense(parsed.data);
  return success(entry, "Expense recorded.", 201);
}, "revenue.manage");
