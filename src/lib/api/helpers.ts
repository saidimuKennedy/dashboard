import { NextRequest, NextResponse } from "next/server";
import { z, ZodType } from "zod";
import { validationError } from "@/lib/api/response";

export type ParseBodyResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse };

export async function parseBody<S extends ZodType>(
  request: NextRequest,
  schema: S
): Promise<ParseBodyResult<z.infer<S>>> {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return { ok: false, response: validationError(parsed.error) };
  return { ok: true, data: parsed.data };
}

export function getClientIp(request: NextRequest): string | null {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    null
  );
}

export function paginatedData<T>(items: T[], total: number, page: number, limit: number) {
  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
