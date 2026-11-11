import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { getProjects } from "@/lib/data";
import { house } from "@/lib/houses";

export const metadata: Metadata = {
  title: "Projects",
  description: "Models, evaluations, tools and datasets from AI at ITC, each held to the charter.",
};

export default async function ProjectsPage() {
  const PROJECTS = await getProjects();
  return (
    <>
      <PageHero
        eyebrow="projects · models, evals, tools"
        title={<>What we&apos;re <span className="grad">building.</span></>}
        sub="Every project names the principles it answers to and the houses it is built with. Status is stated plainly, including when something is still only an idea."
        crumbs={[{ href: "/projects", label: "projects" }]}
      />
      <div className="wrap">
        <div className="cards">
          {PROJECTS.map((p) => (
            <Link key={p.slug} href={`/projects/${p.slug}`} className="card card-link">
              <div className="card-top"><span className="tag">{p.kind}</span><span className="spec">{p.status}</span></div>
              <h3>{p.name}</h3>
              <p>{p.summary}</p>
              <dl>
                <div><dt>houses</dt><dd>{["AI", ...p.houses.map((h) => house(h.id).name)].join(" × ")}</dd></div>
                <div><dt>principles</dt><dd>{p.principles.length}</dd></div>
              </dl>
              <span className="card-more">read more <span aria-hidden="true">→</span></span>
            </Link>
          ))}
        </div>
        <p className="placeholder-note">{"// placeholder projects. Replace with real releases."}</p>
      </div>
    </>
  );
}
