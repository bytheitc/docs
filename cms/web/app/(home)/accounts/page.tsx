import { updateUser } from "@/app/actions";
import { NewUserForm, SpacePicker } from "@/components/Forms";
import { authed, requireUser } from "@/lib/session";
import { ROLES, type SpaceSummary, type User } from "@/lib/types";

export const metadata = { title: "Accounts" };

type Props = { searchParams: Promise<{ saved?: string; error?: string }> };

export default async function AccountsPage({ searchParams }: Props) {
  const me = await requireUser("admin");
  const { saved, error } = await searchParams;
  const [{ users }, { spaces }] = await Promise.all([
    authed<{ users: User[] }>("/v1/users"),
    authed<{ spaces: SpaceSummary[] }>("/v1/spaces"),
  ]);
  const options = spaces.map((s) => ({ id: s.id, label: s.title }));
  const spaceName = (id: string) => spaces.find((s) => s.id === id)?.title ?? id;

  return (
    <div className="cms-page">
      <header className="cms-head">
        <p className="cms-kicker">Access</p>
        <h1>Accounts</h1>
        <p className="cms-muted">
          <strong>Editors</strong> draft and submit. <strong>Publishers</strong> also publish, reorder and delete.
          <strong> Admins</strong> also manage people and see the audit log. Each account opens only the spaces it is given.
        </p>
      </header>

      {saved && <p className="cms-flash ok" role="status">Saved.</p>}
      {error && <p className="cms-flash bad" role="alert">{error}</p>}

      <section className="cms-users" aria-label="People">
        {users.map((u) => {
          const self = u.id === me.id;
          return (
            <form key={u.id} action={updateUser} className="cms-panel cms-user" aria-label={u.name}>
              <input type="hidden" name="id" value={u.id} />
              <div className="cms-user-head">
                <strong>{u.name}</strong>
                {self && <span className="cms-muted">(you)</span>}
                <span className="cms-mono cms-muted">{u.email}</span>
                <span className="cms-muted">· {u.role === "admin" || u.spaces === "*" ? "all spaces" : u.spaces.length ? u.spaces.map(spaceName).join(", ") : "no spaces"}{u.disabled ? " · disabled" : ""}</span>
              </div>
              {!self && (
                <div className="cms-row-form">
                  <div className="cms-field">
                    <label className="cms-label" htmlFor={`r-${u.id}`}>Role</label>
                    <select id={`r-${u.id}`} name="role" defaultValue={u.role}>
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="cms-field">
                    <label className="cms-label" htmlFor={`d-${u.id}`}>Access</label>
                    <select id={`d-${u.id}`} name="disabled" defaultValue={u.disabled ? "true" : "false"}>
                      <option value="false">active</option>
                      <option value="true">disabled</option>
                    </select>
                  </div>
                  <SpacePicker spaces={options} value={u.role === "admin" ? "*" : u.spaces} idPrefix={`s-${u.id}`} />
                  <button type="submit" className="cms-btn">Save {u.name.split(" ")[0]}</button>
                </div>
              )}
            </form>
          );
        })}
      </section>

      <section className="cms-panel">
        <h2>Add someone</h2>
        <NewUserForm spaces={options} />
      </section>
    </div>
  );
}
