import { currentAccount } from "@/lib/session";

export const metadata = { title: "Your account" };

export default async function Account() {
  const me = await currentAccount();

  if (!me) {
    return (
      <div className="wrap">
        <h1>Your account</h1>
        <p>You’re not signed in.</p>
        <p><a className="btn" href="/login/start">Sign in with ITC</a></p>
      </div>
    );
  }

  return (
    <div className="wrap">
      <h1>Your account</h1>
      <p>Signed in as <strong>{me.name ?? me.preferred_username ?? me.sub}</strong>{me.preferred_username ? ` (@${me.preferred_username})` : ""}.</p>
      <form action="/login/signout" method="post">
        <button type="submit" className="btn-ghost btn">Sign out</button>
      </form>
    </div>
  );
}
