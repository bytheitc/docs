import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PolicyPage } from "@/components/PolicyPage";
import { getPolicy } from "@/lib/data";

export async function generateMetadata(): Promise<Metadata> {
  const p = await getPolicy("terms");
  return p ? { title: p.metaTitle, description: p.description } : {};
}

export default async function TermsPage() {
  const p = await getPolicy("terms");
  if (!p) notFound();
  return <PolicyPage title={p.title} intro={p.intro} sections={p.sections} />;
}
