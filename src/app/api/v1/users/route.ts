import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody, getClientIp, paginatedData } from "@/lib/api/helpers";
import { parsePagination } from "@/lib/api/response";
import { createUserSchema } from "@/lib/validations";
import { hashPassword, toSessionUser } from "@/lib/auth/session";
import { auditLog } from "@/lib/logger/audit";
import { db } from "@/lib/db";

export const GET = withAuth(async (request) => {
  const { page, limit, skip } = parsePagination(request.nextUrl.searchParams);
  const where = { deletedAt: null };
  const [items, total] = await Promise.all([
    db.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        lastLogin: true,
        createdAt: true,
      },
    }),
    db.user.count({ where }),
  ]);
  return success(paginatedData(items, total, page, limit));
}, "admin.access");

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, createUserSchema);
  if (!parsed.ok) return parsed.response;

  const passwordHash = await hashPassword(parsed.data.password);
  const created = await db.user.create({
    data: {
      email: parsed.data.email,
      passwordHash,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      role: parsed.data.role,
      status: parsed.data.status,
    },
  });

  await auditLog({
    userId: user.id,
    action: "user.create",
    resource: "users",
    resourceId: created.id,
    ipAddress: getClientIp(request),
  });

  return success(toSessionUser(created), "User created.", 201);
}, "admin.access");
