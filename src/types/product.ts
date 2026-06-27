export type ProductRelease = {
  id: string;
  version: string;
  notes: string | null;
  releasedAt: string;
};

export type ProductDetail = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  releases: ProductRelease[];
};

export const PRODUCT_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "beta", label: "Beta" },
  { value: "deprecated", label: "Deprecated" },
  { value: "planned", label: "Planned" },
];
