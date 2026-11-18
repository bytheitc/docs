#!/usr/bin/env node
// Creates The First Hundred's labels and issues on GitHub from tasks.mjs, with the gh CLI.
//
//   node scripts/first-hundred/create-issues.mjs            preview: what would be created, nothing sent
//   node scripts/first-hundred/create-issues.mjs --apply    create them
//   ... --only bytheitc/portal                              one repository
//
// Safe to run again: labels are created or updated, and an issue whose title already exists in
// that repository with the first-hundred label (open or closed) is skipped. The repositories must
// be public for contributors to see the issues.
import { execFileSync } from "node:child_process";
import { CLOSE, REFRESH, TASKS } from "./tasks.mjs";

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : null;

const LABELS = [
  ["first-hundred", "0F5C4D", "The First Hundred: a launch task, about half an hour"],
  ["good first issue", "7057ff", "Good for newcomers"],
  ["track:code", "B8862F", "First Hundred track: code"],
  ["track:tests", "B8862F", "First Hundred track: tests"],
  ["track:docs", "B8862F", "First Hundred track: documentation"],
  ["track:design", "B8862F", "First Hundred track: design"],
  ["track:accessibility", "B8862F", "First Hundred track: accessibility"],
  ["track:writing", "B8862F", "First Hundred track: writing"],
];

const gh = (a) => execFileSync("gh", a, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const tasks = TASKS.filter((t) => !only || t.repo === only);
const existingTasks = REFRESH.filter((t) => !only || t.repo === only);
const closing = CLOSE.filter((t) => !only || t.repo === only);
const repos = [...new Set([...tasks, ...existingTasks, ...closing].map((t) => t.repo))];

const titles = new Set(tasks.map((t) => `${t.repo}|${t.title}`));
if (titles.size !== tasks.length) { console.error("Two tasks share a title in the same repository; fix tasks.mjs."); process.exit(1); }

console.log(`${tasks.length} new tasks, ${existingTasks.length} existing issues to rewrite, ${closing.length} to close, in ${repos.length} repositories${APPLY ? "" : " (preview; add --apply to make the changes)"}\n`);
let created = 0, skipped = 0;
for (const repo of repos) {
  const mine = tasks.filter((t) => t.repo === repo);
  let existing = new Set();
  try {
    const visibility = JSON.parse(gh(["repo", "view", repo, "--json", "visibility"])).visibility;
    if (visibility !== "PUBLIC") console.warn(`  ! ${repo} is ${visibility.toLowerCase()}: contributors won't be able to see these issues.`);
    existing = new Set(JSON.parse(gh(["issue", "list", "-R", repo, "--label", "first-hundred", "--state", "all", "--limit", "500", "--json", "title"])).map((i) => i.title));
  } catch (e) {
    console.error(`  ! ${repo}: ${String(e.stderr || e.message).trim()}`);
    if (APPLY) process.exit(1);
  }
  console.log(`${repo}: ${mine.length} new tasks, ${mine.filter((t) => existing.has(t.title)).length} already there`);
  if (APPLY) for (const [name, color, description] of LABELS) gh(["label", "create", name, "-R", repo, "--color", color, "--description", description, "--force"]);
  for (const c of closing.filter((x) => x.repo === repo)) {
    console.log(`  - #${c.number}: close (${c.reason})`);
    if (APPLY) gh(["issue", "close", String(c.number), "-R", repo, "--reason", c.reason, "--comment", c.comment]);
  }
  for (const e of existingTasks.filter((x) => x.repo === repo)) {
    console.log(`  ~ #${e.number}: rewrite as "${e.title}", label first-hundred, track:${e.track}`);
    if (APPLY) gh(["issue", "edit", String(e.number), "-R", repo, "--title", e.title, "--body", e.body, "--add-label", `first-hundred,good first issue,track:${e.track}`]);
  }
  for (const t of mine) {
    if (existing.has(t.title)) { skipped++; continue; }
    console.log(`  + [${t.track}] ${t.title}`);
    if (!APPLY) continue;
    const url = gh(["issue", "create", "-R", repo, "--title", t.title, "--body", t.body, "--label", `first-hundred,good first issue,track:${t.track}`]).trim();
    console.log(`    ${url}`);
    created++;
  }
}
console.log(`\n${APPLY ? `created ${created}` : "would create " + (tasks.length - skipped)}, skipped ${skipped} that already exist.`);
