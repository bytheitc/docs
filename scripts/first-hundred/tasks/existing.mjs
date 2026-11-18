// Issues that already exist on GitHub. Each is closed (done, superseded or not planned) or
// kept and rewritten against today's code, then labelled into The First Hundred. Checked
// against the code on 18 November 2026.
import { body } from "./body.mjs";

/** Close these, with the reason GitHub records and a comment saying why. */
export const CLOSE = [
  { repo: "bytheitc/hifz", number: 2, reason: "completed", comment: "Done: `lib/backup.ts` and `components/BackupControls.tsx` save a trail to a file and restore it, adding only what is missing." },
  { repo: "bytheitc/hifz", number: 7, reason: "completed", comment: "Done: the due list shows each surah's Arabic name in Amiri Quran beside the English." },
  { repo: "bytheitc/hifz", number: 8, reason: "completed", comment: "Done: keys 1, 2 and 3 grade the top of the queue and U undoes, ignored while typing in a form." },
  { repo: "bytheitc/zakat", number: 2, reason: "completed", comment: "Done: the landing page has a \"What counts\" section (counted, taken away, not counted), and Help explains debts, nisab and the hawl." },
  { repo: "bytheitc/zakat", number: 4, reason: "completed", comment: "Done: every figure, including the metal price, is now saved in the browser between visits." },
  { repo: "bytheitc/zakat", number: 6, reason: "not planned", comment: "Not planned for now: translation is out of scope while the core is being built. It can be reopened later." },
];

const T = (repo, number, track, title, b) => ({ repo, number, track, title, body: body(b) });
const H = "bytheitc/hifz";
const Z = "bytheitc/zakat";

/** Keep these, with a title and body rewritten for the current code. */
export const REFRESH = [
  T(H, 1, "code", "Add juz boundaries, and make the progress grid real", {
    why: "Almost everyone memorising thinks in juz (\"I'm on juz 29\"), and the app can't say it. The progress card draws 30 cells, but today they are thirtieths of the Qur'an by ayah count, not real juz.",
    todo: ["Add the 30 juz start points (surah and ayah) to `data/`, with the source named (Tanzil's metadata is a good one; credit it).", "Report juz completed and in progress in `lib/progress.ts`.", "Make the 30 cells in `components/ProgressCard.tsx` the real juz: full, started or not started."],
    done: ["A test that there are exactly 30, strictly increasing", "The grid shows a student who knows only juz 30 as one full cell", "`pnpm test` passes"],
    files: ["data/", "lib/progress.ts", "lib/progress.test.ts", "components/ProgressCard.tsx"],
  }),
  T(H, 3, "code", "A revision streak", {
    why: "The app shows what is due but not whether you have been turning up, and for a daily habit that is most of the motivation. The new design has room for it at the top of the day.",
    todo: ["Record which days had at least one grade, and compute the current and longest streak in a new `lib/streak.ts`.", "Be honest: a day with nothing due neither breaks nor extends a streak.", "Show it in the day's overview card (`components/Coach.tsx`)."],
    done: ["Tests for a gap, a day with nothing due, and a streak across a month boundary", "`pnpm test` passes"],
    files: ["lib/ (new)", "lib/store.ts", "components/Coach.tsx"],
  }),
  T(H, 4, "code", "Revision presets: gentle, standard, intensive", {
    why: "The intervals are fixed at 1, 3, 7, 16, 35 and 90 days. Some people revise far more intensively than that assumes, particularly in Ramadan.",
    todo: ["Add presets plus a custom option to `lib/srs.ts`, stored with the trail.", "Think through what happens to a portion on stage 6 when the table shortens to four entries, and test it.", "A settings panel in the app, in the Halaqah style."],
    done: ["Changing preset never loses a portion or its history", "`pnpm test` passes"],
    files: ["lib/srs.ts", "lib/srs.test.ts", "lib/store.ts", "app/trail/page.tsx"],
    hints: ["The adaptive scheduler (FSRS) is a separate issue; keep this one about the fixed ladder."],
  }),
  T(H, 5, "code", "Split and merge portions", {
    why: "\"Al-Baqarah 1–20\" and \"21–40\" stay two entries with two schedules even once a student knows them as one stretch, and the reverse case has no answer either.",
    todo: ["Let a portion be split at an ayah, and two adjoining portions be merged, from Your trail.", "Decide, and write in the PR, what happens to the stage and lapse count when two portions with different histories merge."],
    done: ["Tests for both, including merging portions on different stages", "`pnpm test` passes"],
    files: ["lib/progress.ts", "lib/store.ts", "components/TrailList.tsx"],
  }),
  T(H, 6, "code", "How long until I finish? A projection", {
    why: "The hardest question for anyone memorising is whether their pace is realistic. The dates portions were added already answer it.",
    todo: ["Estimate ayahs per week from when portions were added, and project a finish date with an honest range.", "Refuse to project from fewer than a few weeks of history rather than print a confident wrong number.", "Show it under the progress card."],
    done: ["Tests for a steady pace, a stalled one and too little history", "`pnpm test` passes"],
    files: ["lib/ (new projection.ts)", "components/ProgressCard.tsx"],
  }),
  T(H, 9, "code", "Work offline: add a service worker", {
    why: "The manifest and icons are done, so Hifz installs to the home screen, but with no service worker it won't open without a connection. Revision happens on planes and in masjid basements.",
    todo: ["Add a service worker that caches the app shell and the static data, network-first for pages.", "Zakat Kit already does this; its `public/sw.js` and `components/pwa/ServiceWorkerBridge.tsx` in bytheitc/zakat are a good model.", "Never cache api responses that carry a session."],
    done: ["With the network off, an installed Hifz opens to the trail and grading works", "An update to the app takes effect on the next load"],
    files: ["public/ (new sw.js)", "app/layout.tsx", "app/manifest.ts"],
  }),
  T(H, 10, "docs", "What should a lapse really cost? Research first", {
    why: "A lost portion drops straight to the first stage, due tomorrow. That is a guess, and for someone who has lost the same portion four times it may make things worse.",
    todo: ["Research how established hifz revision methods handle repeated loss (ask teachers too), and write it up in this issue.", "Propose a change. Discussion before code."],
    done: ["A written proposal in the issue that a maintainer agrees to"],
    files: ["lib/srs.ts", "lib/trouble.ts"],
  }),

  T(Z, 1, "code", "Format numbers as they are typed", {
    why: "Typing 1200000 gives no feedback, and one zero too many makes the whole answer ten times wrong without anyone noticing.",
    todo: ["Show the value grouped for the home currency (1,200,000, or 12,00,000 for lakh grouping) as it is typed, in `components/Field.tsx`.", "Don't throw the cursor to the end: test editing in the middle of a number."],
    done: ["Works for the currencies in `lib/currency.ts`", "The parsed value is unchanged (tests)"],
    files: ["components/Field.tsx", "lib/currency.ts"],
  }),
  T(Z, 3, "design", "A printable zakat slip", {
    why: "The app tells people to check their result with someone qualified, then gives them no tidy way to take the working with them.",
    todo: ["Add print styles for the result: one A4 page with the Ankara band, the yellow answer, the account-by-account working, and the choices made (currency, nisab basis and price, rate).", "Add a Print button."],
    done: ["A printed PDF in the PR, readable in black and white"],
    files: ["app/calculate/page.tsx", "app/globals.css"],
  }),
  T(Z, 5, "code", "A hawl reminder: your zakat date each year", {
    why: "Zakat is due on wealth held a full lunar year, and knowing when your year turns is half the problem.",
    todo: ["Let people record the Hijri date their zakat year begins, and show the next one in Hijri and Gregorian.", "Convert dates in a pure, tested function (the browser's Intl Islamic calendars are a fine start), with a note that sighting may differ by a day.", "Offer a yearly reminder as a calendar file (.ics) made in the browser."],
    done: ["Tests for the conversion across a year boundary", "The .ics opens in Google and Apple Calendar"],
    files: ["lib/ (new hijri.ts)", "app/calculate/page.tsx"],
  }),
  T(Z, 7, "code", "Gold jewellery that is worn: let the person choose", {
    why: "Whether jewellery in regular personal use is zakatable is a live question for many families, and schools differ. The calculator counts whatever is entered under gold and silver.",
    todo: ["Write up the main positions in this issue first and agree the wording.", "Then split gold and silver into \"held as savings\" and \"jewellery worn regularly\", with a choice of whether to count the second, both views named."],
    done: ["The wording is agreed in the issue", "Tests for both choices; `pnpm test` passes"],
    files: ["lib/zakat.ts", "app/calculate/page.tsx", "components/app/HelpCenter.tsx"],
  }),
  T(Z, 8, "code", "Round the result up, if you want to", {
    why: "Many people prefer to round zakat up to be safe, and an exact figure like 32,487 invites it.",
    todo: ["Offer an optional round-up to a sensible step for the home currency (100 or 1,000 for naira, 10 for pounds), clearly labelled as giving more than calculated, never less.", "Show both figures."],
    done: ["Tests for several currencies; rounding never goes down", "`pnpm test` passes"],
    files: ["lib/zakat.ts", "lib/zakat.test.ts", "app/calculate/page.tsx"],
  }),
  T(Z, 9, "code", "Plan a term, not just a month", {
    why: "Students' money arrives in lumps at the start of a term and has to last until the next one; the monthly plan assumes a monthly income.",
    todo: ["Let the plan take a start and end date, and base the daily figure on that period.", "Keep monthly as the default."],
    done: ["Tests for a term crossing two month ends", "`pnpm test` passes"],
    files: ["lib/budget.ts", "lib/budget.test.ts", "app/calculate/page.tsx"],
  }),
  T(Z, 10, "accessibility", "Check the calculator with a screen reader", {
    why: "The result updates as people type, steps tick off, and the currency and nisab choices are custom controls. Nobody has checked them with a screen reader.",
    todo: ["Go through the calculator, the business tools and sign-up with VoiceOver or TalkBack, and write up what you hear.", "Announce changes to the zakat due through a polite live region, debounced.", "Fix what you can; open issues for the rest."],
    done: ["Notes or a short recording in the PR"],
    files: ["app/calculate/page.tsx", "app/business/page.tsx", "components/Field.tsx"],
  }),
];
