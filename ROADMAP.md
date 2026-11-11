# ITC Roadmap

Where the six properties go next. Today they are polished but static: content lives in TypeScript files,
forms send nothing, and nobody can sign in. This plan turns them into working products.

---

## 0. Foundations (everything else depends on these)

| # | Item | Notes |
|---|---|---|
| F1 | **Version control + CI** | Put the code in git. Run typecheck and build for all six apps on every pull request. |
| F2 | **Hosting + domains** | Six deployments: `itc.org`, `ai.`, `engineering.`, `institute.`, `oss.`, `research.`. Set the `NEXT_PUBLIC_ITC_*_URL` variables. |
| F3 | **Database** | MongoDB (Atlas). Each app uses its own database on a shared cluster. All access goes through a storage-adapter interface, so other databases can be added later. |
| F4 | **ITC Account** (one sign-in for every site) | A central sign-in at `id.itc.org`. The session cookie is set on `.itc.org`, so signing in once works on all six subdomains. Sign-in options: email magic link, passkeys, GitHub, Google. This is Engineering's **Qibla** platform, built for real. |
| F5 | **Native admins** (decided) | Every app has its own `/admin`, built on one schema-driven CMS kit copied into each app: roles (editor, publisher, admin), draft → review → publish, edits to live entries held as pending, revisions, inbox, audit log. The kit is the seed of a future standalone CMS that anyone can use and that supports multiple databases. |
| F6 | **Transactional email** | Confirmations, magic links, application updates, newsletter. |
| F7 | **Shared design package** | Move the Khatam mark, the Collective bar and the house list into a versioned package (this is Engineering's **Mizan**). That ends the copy-into-six-apps maintenance. |

### Roles

| Role | Can do |
|---|---|
| `member` | Signed-in person: profile, RSVPs, applications, claimed issues |
| `editor:<house>` | Edit and draft content for one house |
| `publisher:<house>` | Publish for that house; triage that house's inbox |
| `reviewer:<program>` | Score applications for one program, e.g. a fellowship cycle |
| `conduct` | Only role that can read code-of-conduct reports |
| `admin` | Everything, plus role management |

---

## 1. Connecting GitHub (and other platforms)

> **Decided:** a standalone **contributor portal** app (`portal/`, port 3006) with its own admin. Providers are plug-ins: GitHub, GitLab, Codeberg/Forgejo, Hugging Face, ORCID, Wikimedia, Crowdin. Contributors can also log work no platform tracks. No ranking.

There are two different GitHub connections. They solve different problems.

### A. "Connect GitHub" on a person's ITC Account (OAuth)
A person links their GitHub identity to their ITC Account.
- **Scope:** `read:user` only. We never get write access to anyone's repositories.
- **What we store:** GitHub user id, username and avatar. Nothing else.
- **What it unlocks:** claiming issues, the "my contributions" dashboard, appearing on the contributors wall (opt-in), applying for roles with a GitHub profile attached.
- **Control:** disconnect at any time, which also deletes the stored link (*amānah*).

### B. The ITC GitHub App (installed on the ITC organization)
This is the collective's own integration with its own repositories.
- **Permissions:** read code and metadata, read and write issues and pull requests (for assignment, labels and bot comments), plus webhooks.
- **Webhooks we listen to:** `issues`, `issue_comment`, `pull_request` (opened, merged), `release`, `repository`.
- **What it powers:** live repos and issues on the OSS site, automatic issue claiming, the contributors wall built from merged PRs, sprint boards, and RFC discussion.

### How the two work together (example: claiming a good first issue)
1. A visitor on `oss.itc.org/projects/hijri-kit` clicks **Claim this issue**.
2. If they're not signed in, they sign in with their ITC Account. If they haven't linked GitHub, they're prompted to connect it (A).
3. The GitHub App (B) assigns the issue to their GitHub username, adds a `claimed` label and posts a friendly comment that links the contributing guide.
4. The claim expires after N days without a linked PR, and the issue is released automatically.
5. When their PR merges, the webhook records the contribution. If they've opted in, they appear on `/contributors`, and the contribution shows on their member dashboard.

### ORCID (for researchers and fellows)
ORCID is the standard identifier for researchers, and it also supports OAuth. Linking ORCID lets Research
and the Institute attribute publications, datasets and proceedings to the right person, and pre-fill fellowship applications.

---

## 2. Per house

### Collective (`site/`)
- **Membership:** apply → reviewed in the Studio (*shūrā*) → welcome email. The member dashboard shows your involvement across all houses.
- **Member directory:** opt-in only, visible to members only by default.
- **Events:** RSVP, calendar files (.ics) and reminders; check-in on the day; recordings archive afterwards.
- **Newsletter:** double opt-in, with one list per house that people choose themselves.
- **Volunteer board:** needs posted by any house, matched to members' stated skills.
- **Donations:** a real payment processor and receipts. Zakat eligibility needs scholarly guidance and legal advice first.
- **Content:** news, team, FAQ and pages move into the Studio.

### AI (`ai/`)
- **Live evals:** eval runs in CI publish results as data. `/evals` renders them, with version history and methodology links. No hand-typed numbers.
- **Model card registry:** generated from each model repository's metadata, so the cards can't drift from the code.
- **Scholar review workflow:** scholars review and annotate eval questions inside the Studio, with that review recorded as provenance.
- **Interactive demo (careful):** a rate-limited, no-logging sandbox of the "principles mode" assistant. Ship it only after a privacy review.
- **Community self-assessment:** a questionnaire that helps a mosque, school or nonprofit decide whether to adopt an AI tool at all. Answers stay in the browser.
- **Collaboration pipeline:** `/collaborate` submissions go to an AI inbox with statuses (new, in conversation, active, closed).

### Engineering (`engineering/`)
- **RFCs on GitHub:** RFCs live as Markdown in an `rfcs` repository. A pull request is the discussion. The site renders them and links to the PR thread.
- **Handbook as MDX:** kept in the repo, with an "Edit on GitHub" link on every chapter.
- **Real status page:** uptime checks on every platform. Incidents are written in the Studio, and the RSS feed doubles as an incident feed.
- **Careers:** applicant tracking in the Studio. People can apply with GitHub (A) attached, and the hiring stages are visible to the applicant.
- **Dogfooding:** Qibla = the ITC Account (F4). Mizan = the shared design package (F7). Bayt = local dev setup for these apps.
- **Blog:** RSS, plus incident reviews linked from the status page.

### Institute (`institute/`)
- **Fellowship portal:** a multi-step application (saved drafts, document uploads, ORCID pre-fill, references). Referees get an upload link. Reviewers score against a rubric in the Studio, then decide, then email the outcome, all run per seasonal cycle.
- **Center directors:** each director edits their own center's page (`editor:institute`, limited to that center).
- **People profiles:** linked to ITC Accounts and ORCID, published only with consent.
- **Seminars:** registration, reading lists, recordings.
- **Center proposals:** `/propose` submissions go through a review workflow, and the outcome is published.
- **Proceedings:** published with Research. DOIs minted through Zenodo or Crossref.

### Open Source (`oss/`)
- **GitHub App (B):** repos, stars, languages and issues sync live, replacing `lib/repos.ts`.
- **Claim an issue:** the flow in §1.
- **Contributor dashboard:** your claimed issues, open PRs, merged work and next suggestions.
- **Contributors wall:** built from merged PRs, opt-in only.
- **Mentorship:** first-time contributors can request a mentor, who is paired from a volunteer pool.
- **Sprints:** registration, team formation, project and issue pick, a live board during the sprint, and an automatic write-up afterwards.
- **Code of conduct reporting:** a confidential form readable only by the `conduct` role, with an acknowledgement and a case log. This is the most sensitive data in the system and needs the strictest access controls.
- **Maintainer path:** application, review and onboarding checklist, as documented in the governance page.

### Research (`research/`)
- **Publishing pipeline:** draft → internal review → ethics/consent check → copy-edit → publish, all in the Studio.
- **Identifiers:** DOIs for papers and datasets via Zenodo. Authors linked via ORCID.
- **Citation metadata:** Highwire `citation_*` meta tags so Google Scholar indexes the papers properly; BibTeX and RIS export.
- **Gated datasets:** access requests with a data-use agreement, approved per dataset and logged. This matters wherever consent limits sharing.
- **Preregistration registry:** time-stamped and public.
- **Errata log:** a public list of corrections and retractions, linked from each affected paper.
- **Code links:** each publication links to its repository via the OSS GitHub App sync.

---

## 3. Phases

| Phase | Goal | Contents |
|---|---|---|
| **1. Foundations** | Safe to build on | F1–F3, F5 (Studio with content collections), F6 |
| **2. Content in the Studio** | Editors can work without developers | Move all `lib/*.ts` content into the Studio for all six houses; route forms into inboxes; newsletter |
| **3. Accounts + GitHub** | People can participate | F4 ITC Account, GitHub OAuth (A), GitHub App (B), live OSS data, claim-an-issue, contributor dashboard, event RSVP |
| **4. Applications** | Programs run online | Fellowship portal, careers tracking, membership review, center proposals, research publishing pipeline, ORCID |
| **5. Depth** | Each house's signature feature | Live evals, real status page, gated datasets, DOIs, sprint boards, conduct reporting, Arabic/RTL versions, donations, F7 shared design package |

---

## 4. Decisions needed

1. **Domain:** is it `itc.org` or something else? This decides cookie sharing and the subdomain URLs.
2. **GitHub organization:** does one exist? Who administers it?
3. **Editors:** how many, and in which houses? This decides how detailed the roles need to be.
4. **Hosting:** a managed platform, or self-hosted for data sovereignty?
5. **Legal entity:** needed before donations, payroll for paid roles, or collecting personal data at scale. The privacy policy depends on it.
6. **Member directory:** is it visible publicly, to members only, or not at all?
7. **Arabic version:** in Phase 5, or earlier?
