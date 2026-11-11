import { updateUser } from "@/app/admin/actions";
import { NewUserForm } from "@/components/cms/Forms";
import { requireUser } from "@/lib/cms/auth";
import { requireStorage } from "@/lib/cms/storage";
import { ROLES } from "@/lib/cms/types";

export const metadata = { title: "Accounts" };

export default async function UsersPage() {
  const me = await requireUser("admin");
  const users = await requireStorage().listUsers();

  return (
    <div className="cms-page">
      <header className="cms-head">
        <p className="cms-kicker">Access</p>
        <h1>Accounts</h1>
        <p className="cms-muted"><strong>Editors</strong> draft and submit. <strong>Publishers</strong> also publish, reorder and delete. <strong>Admins</strong> also manage people and see the audit log.</p>
      </header>

      <div className="cms-tablewrap">
        <table className="cms-table">
          <thead><tr><th scope="col">Name</th><th scope="col">Email</th><th scope="col">Role</th><th scope="col">Access</th><th scope="col"><span className="cms-sr">Save</span></th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}{u.id === me.id && <span className="cms-muted"> (you)</span>}</td>
                <td className="cms-mono">{u.email}</td>
                <td colSpan={3}>
                  <form action={updateUser} className="cms-row-form">
                    <input type="hidden" name="id" value={u.id} />
                    <label className="cms-sr" htmlFor={`r-${u.id}`}>Role for {u.name}</label>
                    <select id={`r-${u.id}`} name="role" defaultValue={u.role} disabled={u.id === me.id}>
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <label className="cms-sr" htmlFor={`d-${u.id}`}>Access for {u.name}</label>
                    <select id={`d-${u.id}`} name="disabled" defaultValue={u.disabled ? "true" : "false"} disabled={u.id === me.id}>
                      <option value="false">active</option>
                      <option value="true">disabled</option>
                    </select>
                    {u.id !== me.id && <button type="submit" className="cms-btn">Save</button>}
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="cms-panel">
        <h2>Add someone</h2>
        <NewUserForm />
      </section>
    </div>
  );
}
