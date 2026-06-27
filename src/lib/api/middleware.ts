import { NextRequest, NextResponse } from "next/server";
import { Permission, hasPermission } from "@/lib/permissions";
import { getSessionFromRequest, SessionUser } from "@/lib/auth/session";
import { forbidden, unauthorized } from "@/lib/api/response";

export type AuthenticatedHandler = (
  request: NextRequest,
  context: { user: SessionUser; params: Record<string, string> }
) => Promise<NextResponse>;

type RouteContext = {
  params: Promise<Record<string, string>>;
};

export function withAuth(handler: AuthenticatedHandler, permission?: Permission) {
  return async (request: NextRequest, context: RouteContext) => {
    const user = await getSessionFromRequest(request);
    if (!user) return unauthorized();

    if (permission && !hasPermission(user.role, permission)) {
      return forbidden();
    }

    const params = await context.params;
    return handler(request, { user, params });
  };
}
