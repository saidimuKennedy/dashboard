export type ArticleStatus = "DRAFT" | "REVIEW" | "PUBLISHED" | "ARCHIVED";

export type KnowledgeAuthor = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
};

export type KnowledgeCategory = {
  id: string;
  name: string;
};

export type KnowledgeTag = {
  tag: {
    id: string;
    name: string;
  };
};

export type ArticleVersion = {
  id: string;
  version: number;
  createdAt: string;
};

export type KnowledgeListItem = {
  id: string;
  title: string;
  status: ArticleStatus;
  updatedAt?: string;
  createdAt?: string;
  author?: { firstName?: string };
};

export type KnowledgeDetail = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  content: string;
  status: ArticleStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
  author?: KnowledgeAuthor;
  category?: KnowledgeCategory | null;
  tags?: KnowledgeTag[];
  versions?: ArticleVersion[];
};

export type RelatedKnowledgeItem = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  status: ArticleStatus;
};

export const ARTICLE_STATUS_LABELS: Record<ArticleStatus, string> = {
  DRAFT: "Draft",
  REVIEW: "In review",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
};

export const ARTICLE_STATUS_OPTIONS = (
  Object.entries(ARTICLE_STATUS_LABELS) as Array<[ArticleStatus, string]>
).map(([value, label]) => ({ value, label }));
