import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { parseBody, getClientIp } from "@/lib/api/helpers";
import { updateProductSchema } from "@/lib/validations";
import { productRepository } from "@/server/repositories/domains.repository";
import { auditLog } from "@/lib/logger/audit";

export const PATCH = withAuth(async (request, { user, params }) => {
  const parsed = await parseBody(request, updateProductSchema);
  if (!parsed.ok) return parsed.response;
  const existing = await productRepository.getById(params!.id);
  if (!existing) return notFound("Product not found.");
  const product = await productRepository.update(params!.id, parsed.data);
  await auditLog({ userId: user.id, action: "product.update", resource: "products", resourceId: params!.id, ipAddress: getClientIp(request) });
  return success(product, "Product updated.");
});

export const DELETE = withAuth(async (request, { user, params }) => {
  const existing = await productRepository.getById(params!.id);
  if (!existing) return notFound("Product not found.");
  await productRepository.softDelete(params!.id);
  await auditLog({ userId: user.id, action: "product.delete", resource: "products", resourceId: params!.id, ipAddress: getClientIp(request) });
  return success(null, "Product deleted.");
});
