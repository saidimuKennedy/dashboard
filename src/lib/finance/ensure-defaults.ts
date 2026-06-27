import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { DEFAULT_SERVICE_PRODUCTS } from "./constants";

export async function ensureDefaultServiceProducts() {
  await Promise.all(
    DEFAULT_SERVICE_PRODUCTS.map(async (product) => {
      const existing = await db.product.findFirst({
        where: {
          deletedAt: null,
          OR: [{ slug: product.slug }, { name: product.name }],
        },
        select: { id: true },
      });
      if (existing) return;

      try {
        await db.product.create({
          data: {
            name: product.name,
            slug: product.slug,
            description: product.description,
          },
        });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
          return;
        }
        throw err;
      }
    })
  );
}
