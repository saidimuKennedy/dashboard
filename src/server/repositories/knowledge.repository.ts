import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";
import { ArticleStatus, Prisma } from "@prisma/client";

export const knowledgeRepository = {
  async list(params: {
    skip: number;
    take: number;
    status?: ArticleStatus;
    categoryId?: string;
    search?: string;
  }) {
    const where: Prisma.KnowledgeArticleWhereInput = {
      deletedAt: null,
      ...(params.status && { status: params.status }),
      ...(params.categoryId && { categoryId: params.categoryId }),
      ...(params.search && {
        OR: [
          { title: { contains: params.search, mode: "insensitive" } },
          { content: { contains: params.search, mode: "insensitive" } },
          { summary: { contains: params.search, mode: "insensitive" } },
        ],
      }),
    };
    const [items, total] = await Promise.all([
      db.knowledgeArticle.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: "desc" },
        include: { category: true, author: { select: { id: true, firstName: true, lastName: true } }, tags: { include: { tag: true } } },
      }),
      db.knowledgeArticle.count({ where }),
    ]);
    return { items, total };
  },

  async getById(id: string) {
    return db.knowledgeArticle.findFirst({
      where: { id, deletedAt: null },
      include: {
        category: true,
        author: { select: { id: true, firstName: true, lastName: true, email: true } },
        tags: { include: { tag: true } },
        versions: { orderBy: { version: "desc" }, take: 10 },
      },
    });
  },

  async create(data: {
    title: string;
    content: string;
    summary?: string;
    categoryId?: string;
    authorId: string;
    status?: ArticleStatus;
    tagIds?: string[];
  }) {
    const slug = `${slugify(data.title)}-${Date.now()}`;
    return db.knowledgeArticle.create({
      data: {
        title: data.title,
        slug,
        content: data.content,
        summary: data.summary,
        categoryId: data.categoryId,
        authorId: data.authorId,
        status: data.status ?? "DRAFT",
        createdBy: data.authorId,
        tags: data.tagIds?.length
          ? { create: data.tagIds.map((tagId) => ({ tagId })) }
          : undefined,
        versions: { create: { content: data.content, version: 1, createdBy: data.authorId } },
      },
      include: { category: true, tags: { include: { tag: true } } },
    });
  },

  async update(
    id: string,
    data: Partial<{
      title: string;
      content: string;
      summary: string;
      categoryId: string | null;
      status: ArticleStatus;
    }>,
    userId: string
  ) {
    const existing = await db.knowledgeArticle.findUnique({ where: { id } });
    if (!existing) return null;
    const article = await db.knowledgeArticle.update({
      where: { id },
      data: { ...data, updatedBy: userId, version: { increment: 1 } },
    });
    if (data.content && data.content !== existing.content) {
      await db.articleVersion.create({
        data: { articleId: id, content: data.content, version: existing.version + 1, createdBy: userId },
      });
    }
    return article;
  },

  async softDelete(id: string, userId: string) {
    return db.knowledgeArticle.update({
      where: { id },
      data: { deletedAt: new Date(), updatedBy: userId },
    });
  },

  async search(query: string, limit = 20) {
    return db.knowledgeArticle.findMany({
      where: {
        deletedAt: null,
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { content: { contains: query, mode: "insensitive" } },
          { summary: { contains: query, mode: "insensitive" } },
        ],
      },
      take: limit,
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, slug: true, summary: true, status: true, updatedAt: true },
    });
  },
};
