import Link from "next/link";
import { notFound } from "next/navigation";
import { EntryEditor } from "@/components/cms/EntryEditor";
import { can, requireUser } from "@/lib/cms/auth";
import { findCollection } from "@/lib/cms/collections";
import { relationOptions } from "@/lib/cms/relations";

type Props = { params: Promise<{ collection: string }> };

export async function generateMetadata({ params }: Props) {
  const def = findCollection((await params).collection);
  return { title: def ? `New ${def.singular.toLowerCase()}` : "Not found" };
}

export default async function NewEntry({ params }: Props) {
  const user = await requireUser();
  const def = findCollection((await params).collection);
  if (!def) notFound();

  return (
    <div className="cms-page">
      <header className="cms-head">
        <p className="cms-kicker"><Link href={`/admin/c/${def.name}`}>{def.label}</Link></p>
        <h1>New {def.singular.toLowerCase()}</h1>
      </header>
      <EntryEditor
        collection={def.name}
        fields={def.fields}
        idField={def.idField}
        titleField={def.titleField}
        initial={{}}
        originalId={null}
        relationOptions={await relationOptions(def.fields)}
        canPublish={can(user, "publisher")}
        isLive={false}
      />
    </div>
  );
}
