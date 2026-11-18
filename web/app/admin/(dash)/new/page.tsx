import { staffNav } from "@/lib/api";
import { requireStaff } from "@/lib/staff-session";
import { NewPageForm } from "./NewPageForm";

export const metadata = { title: "New page" };

export default async function NewPage() {
  const { token } = await requireStaff("/admin/new");
  const nav = await staffNav(token);
  const sections = nav.ok ? nav.nav.sections.map((s) => s.title) : [];
  return (
    <>
      <div className="admin-head"><div><h1>New page</h1><p>Give it an address and a title; you&apos;ll write it on the next screen.</p></div></div>
      <div className="card" style={{ maxWidth: 640 }}><NewPageForm sections={sections} /></div>
    </>
  );
}
