import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { db } from "@/lib/db";

export const GET = withAuth(async (_request, { user }) => {
  const profile = await db.user.findFirst({
    where: { id: user.id, deletedAt: null },
    select: { id: true, email: true, firstName: true, lastName: true, avatar: true, role: true, status: true, lastLogin: true, createdAt: true },
  });
  return success(profile);
});
