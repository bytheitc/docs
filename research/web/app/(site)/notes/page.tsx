import type { Metadata } from "next";
import Link from "next/link";
import { PageHead } from "@/components/PageHead";
import { formatDate } from "@/lib/notes";
import { getNotes } from "@/lib/data";

export const metadata: Metadata = {
  title: "Working notes",
  description: "Essays and working notes from ITC Research: thinking in progress, published so it can be corrected.",
};

export default async function NotesPage() {
  const notes = [...(await getNotes())].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div className="page">
      <PageHead
        kicker="Working notes"
        title="Notes"
        lede="Shorter essays on method, policy and the questions behind our papers. Thinking in progress, published so that it can be corrected."
      />
      <section className="sec">
        <ol className="note-list wide">
          {notes.map((n) => (
            <li key={n.slug}>
              <p className="pub-meta"><span className="pub-type">{n.group}</span><time dateTime={n.date}>{formatDate(n.date)}</time><span>{n.readingMinutes} min read</span></p>
              <h2><Link href={`/notes/${n.slug}`}>{n.title}</Link></h2>
              <p className="pub-sum">{n.dek}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
