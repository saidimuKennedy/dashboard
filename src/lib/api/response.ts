import { NextResponse } from "next/server";
import { ZodError } from "zod";

export type ApiSuccess<T> = {
  success: true;
  message?: string;
  data: T;
};

export type ApiError = {
  success: false;
  code: string;
  message: string;
  errors?: unknown[];
};

export function success<T>(data: T, message?: string, status = 200) {
  return NextResponse.json({ success: true, message, data } satisfies ApiSuccess<T>, { status });
}

export function error(
  message: string,
  code = "INTERNAL_ERROR",
  status = 500,
  errors?: unknown[]
) {
  return NextResponse.json(
    { success: false, code, message, errors } satisfies ApiError,
    { status }
  );
}

export function validationError(err: ZodError) {
  return error("Validation failed.", "VALIDATION_ERROR", 400, err.issues);
}

export function unauthorized(message = "Authentication required.") {
  return error(message, "UNAUTHORIZED", 401);
}

export function forbidden(message = "Insufficient permissions.") {
  return error(message, "FORBIDDEN", 403);
}

export function notFound(message = "Resource not found.") {
  return error(message, "NOT_FOUND", 404);
}

export function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const sort = searchParams.get("sort") ?? "createdAt";
  const order = searchParams.get("order") === "asc" ? "asc" : "desc";
  return { page, limit, sort, order, skip: (page - 1) * limit };
}
