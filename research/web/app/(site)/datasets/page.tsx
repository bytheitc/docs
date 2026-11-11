import type { Metadata } from "next";
import Link from "next/link";
import { PageHead } from "@/components/PageHead";
import { groupByName } from "@/lib/groups";
import { getDatasets, getGroups } from "@/lib/data";

export const metadata: Metadata = {
  title: "Datasets",
  description: "Datasets from ITC Research, each described by a datasheet. Released where consent allows.",
};

export default async function DatasetsPage() {
  const [DATASETS, groups] = await Promise.all([getDatasets(), getGroups()]);
  return (
    <div className="page">
      <PageHead
        kicker="Data · Datasheets"
        title="Datasets"
        lede="Each dataset is described by a datasheet: why it exists, what it contains, how it was gathered, what people agreed to, and what it should not be used for. Values not yet known are marked pending."
      />
      <section className="sec">
        <table className="groups datasets">
          <thead><tr><th>Dataset</th><th>Group</th><th>Status</th><th>Version</th></tr></thead>
          <tbody>
            {DATASETS.map((d) => (
              <tr key={d.slug}>
                <td>
                  <Link href={`/datasets/${d.slug}`} className="g-name">{d.title}</Link>
                  <p className="ds-sum">{d.summary}</p>
                </td>
                <td className="g-with"><Link href={`/groups/${groupByName(groups, d.group).slug}`}>{d.group}</Link></td>
                <td className="g-with"><span className={`status s-${d.status.replace(/\s+/g, "-").toLowerCase()}`}>{d.status}</span></td>
                <td className="g-with">{d.version ?? <span className="pending">pending</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="contact">Access requests and withdrawals: <a href="mailto:data@example.org">data@example.org</a>. See also the <Link href="/open-science#open-data">open data policy</Link>.</p>
      </section>
    </div>
  );
}
