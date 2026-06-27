import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { createToken, setSessionCookie } from "@/lib/auth/session";

export const POST = withAuth(async (_request, { user }) => {
  const token = await createToken(user);
  await setSessionCookie(token);
  return success({ user, token }, "Session refreshed.");
});
