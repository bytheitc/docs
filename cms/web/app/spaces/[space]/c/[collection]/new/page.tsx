import Link from "next/link";
import { notFound } from "next/navigation";
import { EntryEditor } from "@/components/EntryEditor";
import { relationOptions } from "@/lib/relations";
import { loadSpace, requireUser } from "@/lib/session";
import { can } from "@/lib/types";

type Props = { params: Promise<{ space: string; collection: string }> };

export async function generateMetadata({ params }: Props) {
  return { title: `New · ${(await params).collection}` };
}

export default async function NewEntry({ params }: Props) {
  const user = await requireUser();
  const { space: sid, collection } = await params;
  const { space } = await loadSpace(sid);
  const def = space.collections.find((c) => c.name === collection);
  if (!def) notFound();

  return (
    <div className="cms-page">
      <header className="cms-head">
        <p className="cms-kicker"><Link href={`/spaces/${space.id}/c/${def.name}`}>{def.label}</Link></p>
        <h1>New {def.singular.toLowerCase()}</h1>
      </header>
      <EntryEditor
        space={space.id}
        collection={def.name}
        fields={def.fields}
        idField={def.idField}
        titleField={def.titleField}
        initial={{}}
        originalId={null}
        relationOptions={await relationOptions(space.id, space.collections, def.fields)}
        canPublish={can(user, "publisher")}
        isLive={false}
      />
    </div>
  );
}
