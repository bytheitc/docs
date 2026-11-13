// What this house reads. Everything comes from health/api, which serves the CMS's copy when it can
// and its own seed content when it cannot — so these never throw, and a page's empty state only
// appears when the api itself is unreachable.
import { getPublished, getPublishedOne } from "@/lib/api";
import { fromEditableSections, type DocPage, type DocSection } from "@/lib/doc";

export interface Principle {
  id: string;
  title: string;
  body: string;
}

export const getPrinciples = () => getPublished<Principle>("principles");

/** A long-form page's sections, or null when its document is not published. */
export async function getDoc(slug: "idea"): Promise<DocSection[] | null> {
  const d = await getPublishedOne<DocPage>("docs", slug);
  return d ? fromEditableSections(d.sections) : null;
}
