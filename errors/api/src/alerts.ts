// Tells people when something new breaks, or something fixed breaks again. Nothing else alerts:
// a known, unresolved issue happening once more is what the issue list is for.
//
// Two channels, either or both:
//   ALERT_WEBHOOK_URL  a JSON POST. The body carries "text" (Slack) and "content" (Discord), so an
//                      incoming-webhook URL from either works as is
//   ALERT_EMAIL_TO     through the email house's POST /transactional, so alerts share the
//                      collective's one sending domain and suppression list
//
// At most one alert per issue per ALERT_COOLDOWN_MINUTES, claimed in the database so several
// instances never double up.
import type { Config } from "./config.js";
import { log } from "./observe.js";
import type { ErrorsStore, IngestOutcome, Issue, Project } from "./store/types.js";

export async function maybeAlert(config: Config, store: ErrorsStore, project: Project, issue: Issue, outcome: IngestOutcome): Promise<void> {
  if (outcome !== "new" && outcome !== "regression") return;
  const { webhookUrl, emailTo, emailApiUrl, emailServiceKey, cooldownMs } = config.alerts;
  const canEmail = Boolean(emailTo.length && emailApiUrl && emailServiceKey);
  if (!webhookUrl && !canEmail) return;
  if (!(await store.claimAlert(issue.id, cooldownMs))) return;

  const what = outcome === "new" ? "New issue" : "Regression";
  const link = `${config.publicUrl}/issues/${issue.id}`;
  const line = `${what} in ${project.name}: ${issue.title}`;
  const detail = [issue.culprit && `at ${issue.culprit}`, issue.environments.length && `env ${issue.environments.join(", ")}`, issue.releases.length && `release ${issue.releases.at(-1)}`].filter(Boolean).join(" · ");

  const sends: Promise<unknown>[] = [];
  if (webhookUrl) {
    sends.push(post(webhookUrl, { text: `${line}\n${detail}\n${link}`, content: `**${line}**\n${detail}\n${link}`, issue: { id: issue.id, title: issue.title, culprit: issue.culprit, project: project.slug, outcome, count: issue.count, url: link } }, {}, "webhook"));
  }
  if (canEmail) {
    for (const to of emailTo) {
      sends.push(post(`${emailApiUrl}/transactional`, {
        to,
        category: "errors-alert",
        subject: `[${project.name}] ${what}: ${issue.title}`.slice(0, 200),
        markdown: `**${what}** in **${project.name}**\n\n\`${issue.title}\`\n\n${detail}\n\n[Open the issue](${link})`,
      }, { "x-service-key": emailServiceKey! }, "email"));
    }
  }
  await Promise.all(sends);
}

async function post(url: string, body: unknown, headers: Record<string, string>, channel: string): Promise<void> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body), signal: AbortSignal.timeout(5_000) });
    if (!res.ok) log("warn", `alert via ${channel} rejected: HTTP ${res.status}`);
  } catch (e) {
    log("warn", `alert via ${channel} failed: ${(e as Error).message}`);
  }
}
