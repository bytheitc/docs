export const NEWS_KINDS = ["Announcement", "Notes", "Call"] as const;

export interface NewsPost {
  slug: string;
  title: string;
  kind: (typeof NEWS_KINDS)[number];
  date: string;
  summary: string;
  body: { heading?: string; text: string }[];
}