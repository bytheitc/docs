import type { Metadata } from "next";
import { PageHead } from "@/components/PageHead";
import { PubIndex } from "@/components/PubIndex";
import { getPublications } from "@/lib/data";

export const metadata: Metadata = {
  title: "Publications",
  description: "The full index of ITC Research papers, reports, working notes and datasets, free to read.",
};

export default async function PublicationsPage() {
  const publications = await getPublications();
  return (
    <div className="page">
      <PageHead
        kicker="Index · All publications"
        title="Publications"
        lede="Every paper, report, working note and dataset issued by ITC Research, free to read and free to cite. Filter by type or group, or search titles, abstracts and keywords."
      />
      <section className="sec">
        <PubIndex search publications={publications} />
      </section>
    </div>
  );
}
