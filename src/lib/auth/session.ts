import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { User, UserRole } from "@prisma/client";
import { db } from "@/lib/db";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "jip-dev-secret-change-in-production"
);

export type SessionUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
};

const COOKIE_NAME = "jip_session";
const MAX_AGE = 60 * 60 * 24 * 7;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    sub: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (!payload.sub || !payload.email || !payload.role) return null;
    return {
      id: payload.sub as string,
      email: payload.email as string,
      firstName: (payload.firstName as string) ?? "",
      lastName: (payload.lastName as string) ?? "",
      role: payload.role as UserRole,
    };
  } catch {
    return null;
  }
}

export function toSessionUser(user: User): SessionUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
  };
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function getSessionFromRequest(request: Request): Promise<SessionUser | null> {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return verifyToken(authHeader.slice(7));
  }
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  if (!match) return null;
  return verifyToken(match[1]);
}

export async function authenticateUser(
  email: string,
  password: string
): Promise<SessionUser | null> {
  const user = await db.user.findFirst({
    where: { email, deletedAt: null, status: "ACTIVE" },
  });
  if (!user) return null;
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return null;
  await db.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  });
  return toSessionUser(user);
}
