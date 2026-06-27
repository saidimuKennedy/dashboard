import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody, getClientIp, paginatedData } from "@/lib/api/helpers";
import { parsePagination } from "@/lib/api/response";
import { createProductSchema } from "@/lib/validations";
import { productRepository } from "@/server/repositories/domains.repository";
import { auditLog } from "@/lib/logger/audit";
import { slugify } from "@/lib/utils";

export const GET = withAuth(async (request) => {
  const { page, limit, skip } = parsePagination(request.nextUrl.searchParams);
  const { items, total } = await productRepository.list(skip, limit);
  return success(paginatedData(items, total, page, limit));
});

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, createProductSchema);
  if (!parsed.ok) return parsed.response;
  const product = await productRepository.create({ name: parsed.data.name, slug: slugify(parsed.data.name), description: parsed.data.description });
  await auditLog({ userId: user.id, action: "product.create", resource: "products", resourceId: product.id, ipAddress: getClientIp(request) });
  return success(product, "Product created.", 201);
});
