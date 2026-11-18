// bytheitc/hifz: Hifz Trail, new issues. Paths are relative to that repo.
import { body } from "./body.mjs";

// The existing GitHub issues that stay are kept and rewritten in existing.mjs.

const T = (track, title, b) => ({ repo: "bytheitc/hifz", track, title, body: body(b) });
const TESTS = "`pnpm test` passes (and `pnpm test` in `api/` for api changes).";

export const HIFZ = [
  T("code", "Daily revision reminder: store push subscriptions in the api", {
    why: "People forget to revise; a reminder at a time they choose is the single most requested thing. Installed web apps can receive Web Push on Android and on iOS 16.4+. This is the server half: storing subscriptions and sending.",
    todo: [
      "Add `api/resources/push/`: `POST /push/subscribe` (the browser's PushSubscription, the chosen local time, the time zone), `DELETE /push/subscribe`.",
      "Store only what a reminder needs: the subscription, the time, the zone, and the due count the device last reported (see the scheduling issue). Never the trail.",
      "Add VAPID keys to `api/config/` and `.env.example`, and a `sendReminder(subscription, payload)` helper using the `web-push` package.",
    ],
    done: ["Tests for subscribe, unsubscribe and a send against a mocked push service", TESTS],
    files: ["api/resources/", "api/config/", "api/index.ts"],
  }),
  T("code", "Daily revision reminder: opt in and show the notification", {
    why: "The device half of reminders: asking permission at the right moment (never on first load), subscribing, and showing a notification that says what is due.",
    todo: [
      "Builds on the offline issue (#9, the service worker): the service worker needs a `push` handler that shows \"3 portions due today\" and opens the trail on tap.",
      "Add a reminder setting: off by default, a time picker, and a clear sentence on what is sent to the server (a count and a time, nothing else).",
      "Ask for notification permission only when someone turns reminders on. On iOS, explain that the app must be added to the Home Screen first.",
    ],
    done: ["A notification arrives on an Android phone and an installed iPhone web app", "Turning reminders off unsubscribes"],
    files: ["public/ (service worker)", "app/trail/page.tsx", "lib/api.ts"],
  }),
  T("code", "Daily revision reminder: send at each person's own time, privately", {
    why: "The server shouldn't know what someone has memorised, only when to nudge them and roughly how much is due. So the device reports tomorrow's due count each day, and the server sends at the chosen local time.",
    todo: [
      "When the trail is opened, the device sends tomorrow's due count (computed locally with `lib/srs.ts`) to `POST /push/due`.",
      "Add a scheduled job (Vercel cron, as `api/vercel.json` already supports) that every 15 minutes sends reminders whose local time has just passed and that haven't been sent today.",
      "Handle zones and daylight saving properly; skip a day with nothing due; drop subscriptions the push service reports as gone (HTTP 404/410).",
    ],
    done: ["Tests for zone handling, a skipped empty day, one send per day, and expired subscriptions", TESTS],
    files: ["api/resources/", "api/vercel.json", "lib/srs.ts"],
  }),
  T("code", "Add hizb and rub' al-hizb boundaries", {
    why: "Below the juz, people count in hizb (60) and quarters (240). The app should be able to say \"you have 3 quarters of juz 29\".",
    todo: ["Add `data/quarters.json`: the 240 rub' start points (surah, ayah), with the source named.", "Report hizb and quarters completed in `lib/progress.ts`.", "Tests: exactly 240, strictly increasing, every 8th one starts a juz (once juz data exists, issue #1)."],
    done: ["The data matches its source", TESTS],
    files: ["data/", "lib/progress.ts", "lib/progress.test.ts"],
    hints: ["Tanzil publishes this metadata (quran-data) under the same terms as its text: credit it and don't alter it."],
  }),
  T("code", "Show portions as mushaf pages", {
    why: "Many people memorise by the page of the Madinah mushaf (604 pages): \"I know pages 582 to 604\". The app only speaks in ayat.",
    todo: ["Add the page each ayah starts on (Madinah mushaf, 604 pages) to `data/`, with the source named.", "Add `pagesOf(portion)` to `lib/quran.ts` and show the page range beside each portion.", "Test known pages (e.g. al-Baqarah 2:1 starts page 2; an-Nas is on page 604)."],
    done: ["Page ranges show on the trail", TESTS],
    files: ["data/", "lib/quran.ts", "lib/quran.test.ts"],
  }),
  T("code", "Listen to a portion before revising it", {
    why: "Listening to a good reciter before reciting is how many people revise. A due portion should be one tap from hearing it.",
    todo: ["Add a play button to each due portion that plays its ayat in order from a public per-ayah recitation source (e.g. everyayah.com), with a choice of two or three reciters.", "Stream only; nothing is downloaded for good unless the person asks.", "Show which reciter is playing and credit the source."],
    done: ["Plays a portion that spans two surahs correctly", "Works on a phone; stops when the page is left"],
    files: ["components/DueList.tsx", "lib/quran.ts"],
  }),
  T("tests", "Component tests for grading from the keyboard", {
    why: "Keys 1, 2, 3 and U grade and undo the top of the queue, and must never fire while someone types in the add-portion form. That behaviour has no automated test, so a refactor could break it silently.",
    todo: ["Set up a jsdom environment for component tests in `vitest.config.ts` with Testing Library.", "Test: each key grades the top portion; U undoes; typing digits in the form's inputs doesn't grade anything."],
    done: [TESTS],
    files: ["components/DueList.tsx", "vitest.config.ts"],
  }),
  T("tests", "Api tests for sign-in limits and expired sessions", {
    why: "`api/test/api.test.ts` covers the happy paths. The failure paths that protect accounts (too many sign-in attempts, an expired or tampered token) aren't tested.",
    todo: ["Add tests that hit the rate limit on sign-in and check the 429 and its message.", "Add tests for an expired token and a token signed with the wrong secret on a trail route."],
    done: [TESTS],
    files: ["api/test/api.test.ts", "api/middlewares/auth.ts"],
  }),
  T("accessibility", "Make grading and the week chart work with a screen reader", {
    why: "A blind hafiz should be able to use this. The grade buttons need to say which portion they grade, and the seven-day chart needs a text equivalent.",
    todo: ["Give each grade button an accessible name like \"Grade Ya-Sin 1 to 40 as solid\".", "Announce the result of a grade (and of undo) through a polite live region.", "Give the week chart a text alternative: a list or table of days and counts."],
    done: ["Tested with VoiceOver or TalkBack; a short recording or notes in the PR"],
    files: ["components/DueList.tsx", "components/WeekAhead.tsx"],
  }),
  T("docs", "Explain how the schedule decides what's due", {
    why: "People trust a schedule they understand. The reasoning is in comments in `lib/srs.ts` and `lib/coach.ts`; users never see it.",
    todo: ["Write `docs/how-it-works.md` in plain language: the boxes and intervals, what solid, shaky and lost do, why the queue follows the mushaf's order, when the app says re-learn instead of revise.", "Link it from the README. Keep it accurate to the code; quote the interval table from `lib/srs.ts`."],
    done: ["A maintainer checks it against the code", "Under about 100 lines"],
    files: ["lib/srs.ts", "lib/coach.ts", "docs/ (new)"],
  }),
  T("code", "Print a halaqah's week for the teacher", {
    why: "Many teachers work from paper. A one-page sheet of each student's due portions for the week, with space to mark grades, fits how a halaqah actually runs.",
    todo: ["Add a print view to the teaching mode: one row per student, their due portions per day, boxes to tick solid, shaky or lost.", "Use print CSS; it must fit A4 portrait for up to 12 students.", "Grades marked on paper can be entered back the usual way."],
    done: ["A printed PDF of a 10-student halaqah is in the PR"],
    files: ["components/StudentRoster.tsx", "lib/halaqah.ts", "app/globals.css"],
  }),

  /* ---------- the technology: what Hifz can do that it can't yet ---------- */
  T("code", "Bundle the Qur'an text so a portion can be shown, offline", {
    why: "Hifz Trail knows every portion by surah and ayah numbers but has no text, so it can't show what to recite. Several features below need it, and it must work offline.",
    todo: ["Add the Tanzil Uthmani text to `data/` (verbatim, with Tanzil's notice and credit; it may not be edited).", "Note that Tanzil puts the printed basmala inside ayah 1 of 112 surahs; hold it apart in code, not in the file (see how bytheitc/khutbah does it in `khutbah/quran.py`).", "Add `textOf(portion)` to `lib/quran.ts`, loaded lazily so the first page load doesn't carry it."],
    done: ["`textOf` returns the right ayat for a portion that spans one ayah, a whole surah and a range", "The main bundle size doesn't grow (check `next build` output)", TESTS],
    files: ["data/", "lib/quran.ts"],
  }),
  T("code", "Recite from memory: reveal a portion word by word", {
    why: "Grading is honest only if the student can check themselves. A view that hides the text and reveals it a word or an ayah at a time lets them recite and check without opening a mushaf.",
    todo: ["Builds on the Qur'an-text issue. Add a \"Check myself\" button on each due portion that opens a full-screen view of its text, hidden.", "Tap (or press space) to reveal the next word; hold to reveal the whole ayah; a button reveals all.", "At the end, offer the three grades right there."],
    done: ["Works one-handed on a phone", "Arabic is set right to left in the Quran font, at a readable size"],
    files: ["components/", "app/trail/page.tsx"],
  }),
  T("code", "Spike: recognise recitation on the device with Whisper", {
    why: "The most powerful thing Hifz could do is listen: hear the student recite and mark where they hesitated or skipped, with the audio never leaving the phone. Open Arabic Qur'an speech models exist (for example tarteel-ai/whisper-base-ar-quran on Hugging Face). First we need to know whether one runs fast enough in a browser.",
    todo: ["In a throwaway page, load a small Qur'an-tuned Whisper model with transformers.js (WebGPU, falling back to WASM).", "Record 30 seconds of recitation and transcribe it on the device.", "Measure: download size, load time, transcription time on a mid-range Android phone and a laptop. Write the numbers in the issue."],
    done: ["A short report in the issue with measurements and a recommendation (go, go with a smaller model, or not yet)"],
    files: ["(a branch; nothing merged)"],
  }),
  T("code", "Mark where a recitation went wrong", {
    why: "Once speech can be transcribed (the spike above), it has to be compared with the text: which words were skipped, swapped or added. bytheitc/khutbah already solves this alignment problem in Python; this ports the idea to TypeScript.",
    todo: ["Add `lib/align.ts`: normalise Arabic (drop diacritics, unify alef forms; see `khutbah/quran.py`), then align the transcript to the portion's words with a word-level local alignment.", "Return each word as matched, missed or wrong, plus a suggested grade (all matched: solid; a few misses: shaky; many: lost) that the student can override.", "Pure functions only; no audio in this issue."],
    done: ["Tests with a perfect recitation, a skipped ayah, and a swapped word", TESTS],
    files: ["lib/ (new)", "lib/srs.ts"],
  }),
  T("code", "An adaptive scheduler (FSRS), behind a setting", {
    why: "The schedule today is a fixed ladder of 1, 3, 7, 16, 35 and 90 days. FSRS, the open scheduler modern flashcard apps use, learns each item's stability from its history and usually needs fewer reviews for the same retention.",
    todo: ["Implement FSRS in `lib/fsrs.ts` as pure functions: next interval from the grade history (map solid, shaky and lost to its ratings).", "Add a setting to choose the classic ladder or the adaptive one. The classic stays the default.", "The day's queue is still in the order of the mushaf, whichever scheduler sets the dates."],
    done: ["Tests replaying a grade history through both schedulers", "Switching schedulers never loses a portion or its history", TESTS],
    files: ["lib/srs.ts", "lib/store.ts"],
    hints: ["Read the FSRS algorithm description from the open-spaced-repetition project first, and link it in the PR."],
  }),
  T("code", "Merge grades from two devices without losing any", {
    why: "Grades are stored as an append-only event log, which means two devices' logs can be merged with nothing lost and no \"last write wins\". Sync today is a manual push and pull of the whole trail.",
    todo: ["Write `mergeTrails(a, b)` in `lib/sync.ts`: union the events by id, keep portions added on either side, and resolve a portion removed on one side and graded on the other by keeping it (and saying so).", "Prove it with property tests: merge is commutative, associative and idempotent.", "Use it in `syncOwnTrail` in place of the current replace."],
    done: ["The three properties hold in tests", "Grading on two devices offline, then syncing both, keeps every grade", TESTS],
    files: ["lib/sync.ts", "lib/store.ts", "lib/grading.ts"],
  }),
  T("code", "Hand a record to the teacher by QR code instead of a file", {
    why: "Today a student shares their record with their teacher as a file, which is awkward on phones. Showing a QR code that the teacher's phone scans is how it should feel, and it can stay end-to-end private.",
    todo: ["Encode the same payload the backup file carries (see `lib/backup.ts`), compressed, as one or more QR codes (cycle through them if it is too large for one).", "On the teacher's side, scan with the camera (`BarcodeDetector` where available) and take the record in through the existing `takeInTrail`.", "No server involved."],
    done: ["A 30-portion trail moves from one phone to another by scanning", "The existing file route keeps working"],
    files: ["lib/backup.ts", "components/BackupControls.tsx", "components/StudentRoster.tsx"],
  }),
  T("design", "A forgetting forecast: which surahs are most at risk", {
    why: "The week-ahead chart shows load. Students also want to know which portions they are closest to losing, so they can protect them before they slip.",
    todo: ["From each portion's stage, days overdue and lapses, rank the five most at risk (keep the formula simple and documented).", "Design a small card for it in the Halaqah style: chunky, readable at a glance, with a one-line reason for each."],
    done: ["The ranking function has tests", "Screenshots on phone and desktop in the PR"],
    files: ["lib/trouble.ts", "components/"],
  }),
  T("code", "A small vibration when grading, on phones that support it", {
    why: "The grade buttons press down visually; a short vibration on Android makes them feel physical. A tiny change with a big effect on how the app feels.",
    todo: ["Call `navigator.vibrate` with a short pattern on each grade (a different one for lost).", "Respect reduced-motion preferences, and do nothing where vibration isn't supported (iOS Safari)."],
    done: ["Felt on an Android phone; no errors anywhere else"],
    files: ["components/DueList.tsx"],
  }),
  T("code", "Add a whole juz in one tap", {
    why: "Someone who has memorised juz 30 has to add 37 surahs one by one before the app is useful. Onboarding should take seconds.",
    todo: ["Builds on the juz boundaries issue (#1). Add \"I know a whole juz\" to Your trail: pick juz numbers, and every surah or part of a surah in them is added.", "Show what will be added before adding it, and skip what is already on the trail."],
    done: ["Adding juz 30 adds all of it once, even if some surahs were already there", TESTS],
    files: ["components/AddPortionForm.tsx", "lib/quran.ts", "lib/store.ts"],
  }),
  T("code", "Paste a list of what you know", {
    why: "Teachers and students often already have their hifz written down: \"Al-Mulk, Ya-Sin 1-40, juz 30\". Typing it again portion by portion is where people give up.",
    todo: ["Add a paste box that reads lines like `Al-Mulk`, `67`, `Ya-Sin 1-40`, `36:1-40` and `juz 30` (surah names matched forgivingly, with common spellings).", "Show the parsed portions for confirmation, with anything unreadable flagged, before adding them.", "The parser is a pure function in `lib/` with tests."],
    done: ["Tests for each line format and for misspelt surah names (Yaseen, Yasin, Ya Seen)", TESTS],
    files: ["lib/ (new)", "lib/quran.ts", "components/AddPortionForm.tsx"],
  }),
  T("code", "Delete my account and its data, from the app", {
    why: "Hifz's api lets people register, sign in and sync, but not leave. Someone must be able to delete their account and every record of their hifz on the server themselves.",
    todo: ["Add `DELETE /auth/me` to the api: removes the user and their trails, after re-checking the password.", "Add a \"Delete my account\" section to the account area, explaining that the trail on this device stays unless they also clear it."],
    done: ["Api tests that the user and trails are gone and the token stops working", TESTS],
    files: ["api/resources/auth/", "api/resources/trails/", "app/trail/page.tsx"],
  }),
  T("code", "Change password", {
    why: "There is no way to change a password once an account exists, which also means no way to recover from one that has leaked.",
    todo: ["Add `POST /auth/password` (old and new password), and sign out other sessions by rotating something in the token check.", "Add a small form in the account area."],
    done: ["Api tests for success, a wrong old password and a too-short new one", TESTS],
    files: ["api/resources/auth/", "api/middlewares/auth.ts"],
  }),
];
