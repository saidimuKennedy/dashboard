import { db } from "@/lib/db";
import { DEFAULT_SERVICE_PRODUCTS } from "./constants";

export async function ensureDefaultServiceProducts() {
  for (const product of DEFAULT_SERVICE_PRODUCTS) {
    const existing =
      (await db.product.findUnique({ where: { slug: product.slug } })) ??
      (await db.product.findFirst({
        where: { name: product.name, deletedAt: null },
      }));
    if (existing) continue;

    await db.product.create({
      data: {
        name: product.name,
        slug: product.slug,
        description: product.description,
      },
    });
  }
}
