// Published reviews, shown under each product on /products/[slug]. A visitor's own review
// (the "product-review" form) lands in the inbox first — a steward promotes the good ones here.
// See ARCHITECTURE.md's rule on forms vs collections: the inbox is the moderation queue, this is
// the published result.
export interface ProductReview {
  id: string;
  /** A Product's slug, from products.ts. */
  product: string;
  /** First name or handle is fine. */
  name: string;
  rating: number;
  body: string;
  /** YYYY-MM-DD. */
  date: string;
}

// No seed reviews: these are real people's words, published one at a time from the inbox.
export const SEED_REVIEWS: ProductReview[] = [];
