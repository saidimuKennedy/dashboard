import { NextRequest } from "next/server";
import { authenticateUser, createToken, setSessionCookie } from "@/lib/auth/session";
import { success, unauthorized } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { loginSchema } from "@/lib/validations";
import { auditLog } from "@/lib/logger/audit";

export async function POST(request: NextRequest) {
  const parsed = await parseBody(request, loginSchema);
  if (!parsed.ok) return parsed.response;
  const user = await authenticateUser(parsed.data.email, parsed.data.password);
  if (!user) return unauthorized("Invalid email or password.");
  const token = await createToken(user);
  await setSessionCookie(token);
  await auditLog({ userId: user.id, action: "auth.login", resource: "auth", ipAddress: getClientIp(request) });
  return success({ user, token }, "Login successful.");
}
