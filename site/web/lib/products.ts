// Mirrors site/api/src/content/products.ts and reviews.ts.
export const PRODUCT_STATUSES = ["Live", "Coming soon"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export interface Product {
  slug: string;
  name: string;
  tagline: string;
  status: ProductStatus;
  summary: string;
  body: string[];
  features: string[];
  repoUrl?: string;
  liveUrl?: string;
}

export interface ProductReview {
  id: string;
  product: string;
  name: string;
  rating: number;
  body: string;
  date: string;
}
