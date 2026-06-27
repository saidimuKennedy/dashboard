import { db } from "@/lib/db";
import { DEFAULT_SERVICE_PRODUCTS } from "./constants";

export async function ensureDefaultServiceProducts() {
  for (const product of DEFAULT_SERVICE_PRODUCTS) {
    await db.product.upsert({
      where: { slug: product.slug },
      update: {},
      create: {
        name: product.name,
        slug: product.slug,
        description: product.description,
      },
    });
  }
}
