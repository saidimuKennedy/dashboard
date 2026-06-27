import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody } from "@/lib/api/helpers";
import { productRoadmapSchema } from "@/lib/validations";
import { productRepository } from "@/server/repositories/domains.repository";
import { db } from "@/lib/db";

export const POST = withAuth(async (request) => {
  const parsed = await parseBody(request, productRoadmapSchema);
  if (!parsed.ok) return parsed.response;
  const product = await productRepository.getById(parsed.data.productId);
  if (!product) return success({ productId: parsed.data.productId, items: parsed.data.items ?? [] });
  const ideas = parsed.data.items?.length
    ? await db.idea.createMany({
        data: parsed.data.items.map((item: { title: string; description?: string; priority?: string; stage?: string }) => ({
          ...item,
          productId: parsed.data.productId,
        })),
      })
    : null;
  return success({ productId: parsed.data.productId, ideas });
});
