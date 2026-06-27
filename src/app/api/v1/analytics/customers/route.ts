import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { db } from "@/lib/db";

export const GET = withAuth(async () => {
  const [total, feedback, tickets] = await Promise.all([
    db.customer.count({ where: { deletedAt: null } }),
    db.customerFeedback.count(),
    db.supportTicket.count({ where: { deletedAt: null } }),
  ]);
  return success({ total, feedback, tickets });
}, "customer.manage");
