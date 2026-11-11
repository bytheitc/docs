// Frequently asked questions, shown on /faq.
export interface FaqItem {
  slug: string;
  q: string;
  a: string;
  /** Optional link shown after the answer. */
  link?: { label: string; href: string };
}