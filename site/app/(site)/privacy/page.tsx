import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PolicyPage } from "@/components/PolicyPage";
import { getPolicy } from "@/lib/data";

export async function generateMetadata(): Promise<Metadata> {
  const p = await getPolicy("privacy");
  return p ? { title: p.metaTitle, description: p.description } : {};
}

export default async function PrivacyPage() {
  const p = await getPolicy("privacy");
  if (!p) notFound();
  return <PolicyPage title={p.title} intro={p.intro} sections={p.sections} />;
}
