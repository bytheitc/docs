import Link from "next/link";
import { ClaimForm } from "@/components/portal/Forms";
import { TopBar } from "@/components/portal/TopBar";
import { getSettings } from "@/lib/data";
import { getMe } from "@/lib/portal";
import { requireContributor, sessionToken } from "@/lib/session";
import { httpUrl, providerName } from "@/lib/util";

export const metadata = { title: "Claim an issue" };

const REPO = /^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/;
const ISSUE_URL: Record<string, (repo: string, n: number) => string> = {
  github: (r, n) => `https://github.com/${r}/issues/${n}`,
  gitlab: (r, n) => `${process.env.GITLAB_BASE_URL || "https://gitlab.com"}/${r}/-/issues/${n}`,
  codeberg: (r, n) => `${process.env.CODEBERG_BASE_URL || "https://codeberg.org"}/${r}/issues/${n}`,
};

export default async function Claim({ searchParams }: { searchParams: Promise<{ provider?: string; repo?: string; issue?: string }> }) {
  const sp = await searchParams;
  const provider = String(sp.provider ?? ""), repo = String(sp.repo ?? ""), issue = Number(sp.issue);
  await requireContributor(`/claim?provider=${encodeURIComponent(provider)}&repo=${encodeURIComponent(repo)}&issue=${encodeURIComponent(String(sp.issue ?? ""))}`);
  const valid = ["github", "gitlab", "codeberg", "dev"].includes(provider) && REPO.test(repo) && Number.isInteger(issue) && issue > 0;
  const name = providerName(provider);
  const mine = valid ? await getMe((await sessionToken())!) : null;
  const account = mine?.accounts.find((a) => a.provider === provider);
  const { claimDays } = await getSettings();
  const issueUrl = valid && ISSUE_URL[provider] ? httpUrl(ISSUE_URL[provider](repo, issue)) : null;

  return (
    <>
      <TopBar />
      <main id="main" className="narrow">
        <div className="card form">
          <h1>Claim an issue</h1>
          {!valid ? (
            <p className="flash bad" role="alert">This claim link isn’t valid. It needs a provider, a repository (owner/name) and an issue number.</p>
          ) : (
            <>
              <p>
                <strong>{repo}</strong> #{issue} on {name}
                {issueUrl && <> · <a href={issueUrl} rel="noopener noreferrer" target="_blank">view issue</a></>}
              </p>
              {account ? (
                <>
                  <p className="muted">Claiming tells others you’re working on it. The claim lasts {claimDays} days; if there’s no pull request by then, it’s released so someone else can pick it up.</p>
                  <ClaimForm provider={provider} repo={repo} issue={issue} />
                </>
              ) : (
                <>
                  <p className="flash info">To claim this, link your {name} account first, so the issue can be assigned to you.</p>
                  <p><Link className="btn" href={`/auth/${provider}/start?next=${encodeURIComponent(`/claim?provider=${provider}&repo=${repo}&issue=${issue}`)}`}>Link {name}</Link></p>
                </>
              )}
            </>
          )}
          <p><Link href="/dashboard">Back to your dashboard</Link></p>
        </div>
      </main>
    </>
  );
}
