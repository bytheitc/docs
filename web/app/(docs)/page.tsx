import Link from "next/link";
import { notFound } from "next/navigation";
import { getPage } from "@/lib/api";
import { DocView } from "./DocView";

const PATHS = [
  { n: "01", href: "/contributing", title: "Contribute", body: "Pick a task, claim it on the portal, open a pull request.", tags: ["The First Hundred", "Claiming", "Review"] },
  { n: "02", href: "/products/hifz", title: "The products", body: "What we build, how each works, and how to run your own copy.", tags: ["Hifz Trail", "Zakat Kit", "Ijaazah", "Khutbah"] },
  { n: "03", href: "/platform/sign-in-with-itc", title: "Build with ITC", body: "Sign in with ITC, and the services every ITC app shares.", tags: ["OAuth & OIDC", "Status", "Analytics", "Errors"] },
  { n: "04", href: "/collective/architecture", title: "How it fits together", body: "The houses, the api/web split, and the rules about data.", tags: ["Houses", "Architecture", "Staff tools"] },
];

export default async function Home() {
  const found = await getPage("index");
  if (!found) notFound();
  const hero = (
    <header className="hero">
      <span className="ar" lang="ar" aria-hidden="true">دليل</span>
      <h1>The Islamic Tech Collective, documented.</h1>
      <p className="lede">{found.page.description || "How to contribute, what we build, and how to build on it."}</p>
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
