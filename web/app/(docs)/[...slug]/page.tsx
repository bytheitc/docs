import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getPage } from "@/lib/api";
import { DocView } from "../DocView";

type Props = { params: Promise<{ slug: string[] }> };

const slugOf = async (params: Props["params"]) => (await params).slug.map(decodeURIComponent).join("/");

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = await getPage(await slugOf(params));
  if (!found) return { title: "Not found" };
  return { title: found.page.title, description: found.page.description || undefined, openGraph: { title: found.page.title, description: found.page.description || undefined } };
}

export default async function DocPageRoute({ params }: Props) {
  const slug = await slugOf(params);
  if (slug === "index") redirect("/");
  const found = await getPage(slug);
  if (!found) notFound();
  return <DocView {...found} />;
}
