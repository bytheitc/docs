import Link from "next/link";
import { notFound } from "next/navigation";
import { getPage } from "@/lib/api";
import { DocView } from "./DocView";

const PATHS = [
  { n: "01", href: "/contributing", title: "Contribute", body: "Pick a task, claim it on the portal, open a pull request.", tags: ["The First Hundred", "Claiming", "Review"] },
  { n: "02", href: "/products/hifz", title: "The products", body: "What we build, how each works, and how to run your own copy.", tags: ["Hifz Trail", "Zakat Kit", "Ijaazah", "Khutbah"] },
  { n: "03", href: "/collective/houses", title: "The collective", body: "How the collective is organised, and the houses open to contributors.", tags: ["Collective", "Open Source"] },
];

export default async function Home() {
  const found = await getPage("index");
  if (!found) notFound();
  const hero = (
    <header className="hero">
      <span className="ar" lang="ar" aria-hidden="true">دليل</span>
      <h1>The Islamic Tech Collective, documented.</h1>
      <p className="lede">{found.page.description || "How to contribute, and what we build."}</p>
      <div className="paths">
        {PATHS.map((p) => (
          <Link key={p.n} href={p.href} className="path">
            <span className="n">{p.n}</span>
            <h3>{p.title}</h3>
            <p>{p.body}</p>
            <ul>{p.tags.map((t) => <li key={t}>{t}</li>)}</ul>
          </Link>
        ))}
      </div>
    </header>
  );
  return <DocView {...found} hero={hero} />;
}
