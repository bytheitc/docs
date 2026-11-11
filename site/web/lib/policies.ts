// Draft policies (privacy, terms) shared by all six ITC sites. Pending legal review.
export interface PolicySection { heading: string; body: string[] }

export interface PolicyDoc {
  /** Fixed: "privacy" is shown at /privacy and "terms" at /terms. */
  slug: string;
  title: string;
  /** Browser tab title and search description. */
  metaTitle: string;
  description: string;
  intro: string;
  sections: PolicySection[];
}
