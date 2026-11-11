import type { DocSection } from "@/lib/doc";
import { CONTACT } from "@/lib/site";

// First-timer's guide. Placeholder org name is TODO-itc-oss until the GitHub org exists.
export const SEED_CONTRIBUTE: DocSection[] = [
  {
    id: "before",
    title: "BEFORE YOU START",
    blocks: [
      "You don't need permission to contribute. You don't need to be an expert, and you don't need to know anyone. If you can read an issue and ask a question, you can contribute.",
      "Code is one way in, not the only way. Docs, translations, tests, bug reports, design review and issue triage all count, and all get you on the [contributors wall](/contributors).",
      {
        list: [
          "A GitHub account",
          "`git` installed and configured with your name and email",
          "`bayt`, our one-command dev environment (step 01 below installs it)",
          "About an hour for your first PR. Less after that.",
        ],
      },
      { note: "Read the [code of conduct](/code-of-conduct) first. It is short, and it applies everywhere: repos, issues, chat and sprints." },
    ],
  },
  {
    id: "setup",
    title: "01 · SET UP",
    blocks: [
      "Install `bayt` once. It reads the `bayt.toml` in each repo and installs the right toolchain, so you never fight version managers.",
      { lang: "shell", title: "install bayt", code: "go install github.com/TODO-itc-oss/bayt@latest\nbayt doctor   # tells you exactly what's missing" },
      "Fork the repo you want to work on from its page on GitHub, then clone **your fork** and add the original as `upstream`.",
      {
        lang: "shell",
        title: "clone your fork",
        code: "git clone https://github.com/<you>/mizan-ui.git\ncd mizan-ui\ngit remote add upstream https://github.com/TODO-itc-oss/mizan-ui.git\nbayt up",
      },
      "If `bayt up` doesn't get you to a working dev server, that is a bug in the repo, not in you. Open an issue with the output and label it `dx`.",
    ],
  },
  {
    id: "find",
    title: "02 · FIND AN ISSUE",
    blocks: [
      "Every repo keeps a list of issues labeled `good-first-issue`. They are scoped small, explained properly, and a maintainer has promised to help whoever picks them up. Browse them per project on the [projects page](/projects).",
      {
        steps: [
          "Pick one that interests you. Interest beats difficulty.",
          "Comment **\"I'll take this\"** on the issue. A maintainer will assign it to you, usually within a few days.",
          "If nobody has claimed it, it's yours. If someone claimed it more than two weeks ago with no update, ask politely whether they're still on it.",
          "Found a bug that isn't listed? Open an issue first, describe what you saw and what you expected, then offer to fix it.",
        ],
      },
      { note: "Stuck for more than an hour? Ask in the issue. Asking is contributing: your question probably exposes a gap in the docs." },
    ],
  },
  {
    id: "branch",
    title: "03 · BRANCH",
    blocks: [
      "Never work on `main`. Sync it with upstream, then branch from it. Name the branch after the issue so reviewers can find their way back.",
      {
        lang: "shell",
        title: "sync and branch",
        code: "git switch main\ngit fetch upstream\ngit rebase upstream/main\ngit switch -c fix/42-rtl-icon-mirroring",
      },
      {
        defs: [
          { k: "fix/…", v: "bug fixes" },
          { k: "feat/…", v: "new features" },
          { k: "docs/…", v: "documentation only" },
          { k: "test/…", v: "tests only" },
          { k: "chore/…", v: "tooling, deps, CI" },
        ],
      },
    ],
  },
  {
    id: "commits",
    title: "04 · COMMIT",
    blocks: [
      "Small commits, each one doing one thing. We use [Conventional Commits](https://www.conventionalcommits.org/) so changelogs write themselves.",
      {
        lang: "text",
        title: "commit message format",
        code: "type(scope): short summary in the imperative\n\nOptional body: what changed and why, wrapped at 72 columns.\n\nCloses #42",
      },
      {
        lang: "shell",
        title: "example",
        code: 'bayt test\ngit add src/icon.tsx src/icon.test.tsx\ngit commit -m "fix(icon): mirror directional icons in RTL\n\nCloses #42"',
      },
      "Run the tests before you commit. `bayt test` runs the same suite CI will run, so there are no surprises.",
      "Sign off is optional. There is **no CLA**: your contribution is licensed under the project's licence, and the copyright stays yours.",
    ],
  },
  {
    id: "pr",
    title: "05 · OPEN A PULL REQUEST",
    blocks: [
      { lang: "shell", title: "push", code: "git push -u origin fix/42-rtl-icon-mirroring" },
      "GitHub prints a link to open the PR. Open it against `main` on the upstream repo, and fill in the template:",
      {
        list: [
          "**What** changed, in one or two sentences",
          "**Why**, with a link to the issue (`Closes #42`)",
          "**How to test it**: the exact steps a reviewer should run",
          "Screenshots for anything visual, in both LTR and RTL where it applies",
        ],
      },
      "Not finished? Open it as a **draft**. Early PRs get early feedback, and early feedback saves you rewrites.",
    ],
  },
  {
    id: "review",
    title: "06 · REVIEW",
    blocks: [
      "A maintainer aims to give a first review within a week. If a week passes in silence, comment on the PR to bump it. That's expected, not rude.",
      {
        list: [
          "Reviews critique the code, never the coder. Hold us to that.",
          "Push fixes as new commits during review. Don't force-push until the reviewer asks you to squash.",
          "Disagree? Say so, with reasons. The reviewer may be wrong. Discussion is how we get it right.",
          "Every comment gets a reply or a fix, even if the reply is just \"done\".",
        ],
      },
      {
        lang: "shell",
        title: "update your branch if main moved",
        code: "git fetch upstream\ngit rebase upstream/main\ngit push --force-with-lease",
      },
    ],
  },
  {
    id: "merge",
    title: "07 · AFTER MERGE",
    blocks: [
      "Merged means you're a contributor. Welcome to the commons.",
      {
        steps: [
          "Your name goes on the [contributors wall](/contributors). The merging maintainer adds it, or you can open the PR yourself.",
          "Your change ships in the next release and is credited in the changelog.",
          "Delete your branch and sync your fork's `main`.",
          "Pick the next issue. Second PRs are always easier.",
        ],
      },
      { lang: "shell", title: "clean up", code: "git switch main\ngit pull upstream main\ngit branch -d fix/42-rtl-icon-mirroring\ngit push origin --delete fix/42-rtl-icon-mirroring" },
      `Keep showing up and you will be asked to review. That's the road to maintainer, laid out in [governance](/governance). Questions about any of this: [${CONTACT.maintainers}](mailto:${CONTACT.maintainers}).`,
    ],
  },
];
