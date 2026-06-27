import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { db } from "@/lib/db";

const DEFAULT_WIDGETS = [
  { id: "revenue", type: "revenue", x: 0, y: 0, w: 6, h: 2 },
  { id: "compliance", type: "compliance", x: 6, y: 0, w: 6, h: 2 },
  { id: "tasks", type: "tasks", x: 0, y: 2, w: 4, h: 2 },
  { id: "ai-brief", type: "ai-brief", x: 4, y: 2, w: 8, h: 2 },
];

export const GET = withAuth(async (_request, { user }) => {
  const layout = await db.dashboardLayout.findUnique({ where: { userId: user.id } });
  return success({ widgets: layout?.widgets ?? DEFAULT_WIDGETS });
});
