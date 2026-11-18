// bytheitc/zakat: Zakat Kit. Paths are relative to that repo.
import { body } from "./body.mjs";

const T = (track, title, b) => ({ repo: "bytheitc/zakat", track, title, body: body(b) });
const TESTS = "`pnpm test` passes.";

export const ZAKAT = [
  /* ---------- currencies ---------- */
  T("code", "Enter a rate either way round (1 USD = ? or 1 ? = USD)", {
    why: "Rates are entered as what one unit of the other currency is worth in your home currency. People often have the inverse to hand (\"1 pound is 1,900 naira\" versus \"1 naira is 0.0005 pounds\"), and typing the wrong one silently multiplies a balance by millions.",
    todo: ["In `components/sources/RatesPanel.tsx`, add a toggle per currency to enter the rate the other way round, stored as the converted value.", "Warn when a rate looks inverted: for example, a rate below 1 for a currency that is usually worth more than the home currency."],
    done: ["Tests for both directions and for the warning", TESTS],
    files: ["components/sources/RatesPanel.tsx", "lib/money.ts"],
  }),
  T("code", "Read more currency formats from bank statements", {
    why: "Statement parsing knows a fixed list of currency codes and symbols. Banks in Pakistan, Malaysia, Indonesia and the Gulf print Rs, RM, Rp, SR and AED in ways the parser misses.",
    todo: ["Extend the symbol and code tables in `lib/sources/statement/csv.ts` and `values.ts` for the currencies in `lib/currency.ts`.", "Handle grouping styles like 1.234.567,89 and 12,34,567 (lakh grouping) in `parseAmount`.", "Add a fixture statement for each new format."],
    done: ["Each new format has a test that reads its balance correctly", TESTS],
    files: ["lib/sources/statement/csv.ts", "lib/sources/statement/values.ts", "lib/currency.ts"],
  }),
  T("code", "Offer bank connection only where it works", {
    why: "Connecting a bank goes through Mono, which covers Nigerian banks only. Someone who chose pounds should not be offered it.",
    todo: ["Show the bank-connection option only when the home currency is NGN and the Mono key is configured.", "Elsewhere, say plainly that statement import is the way in."],
    done: ["Tests or a manual check for both cases"],
    files: ["lib/sources/connect/bank.ts", "app/calculate/page.tsx"],
  }),

  /* ---------- the calculators ---------- */
  T("code", "Zakat on shares and investment funds", {
    why: "Many people's wealth is in shares, pensions or funds. Scholars hold two main methods: zakat on the full market value of shares held for trade, or on the company's zakatable assets per share for long-term holdings.",
    todo: ["Add a shares section to the calculator with both methods, each named and explained in a sentence, the person choosing.", "Add the arithmetic to `lib/zakat.ts` with tests.", "Get the explanatory text checked by a maintainer before merging."],
    done: ["Both methods tested", "No method is chosen by default without the person seeing both", TESTS],
    files: ["lib/zakat.ts", "app/calculate/page.tsx", "components/app/HelpCenter.tsx"],
  }),
  T("code", "Zakat on crops and harvests (ʿushr)", {
    why: "Farming families pay zakat on harvests by a different rule: 10% of produce from rain-fed land, 5% from irrigated land, above a threshold of five wasq (about 653 kg).",
    todo: ["Add a harvest calculator tab: produce in kg, rain-fed or irrigated, and price per kg for the cash value.", "Put the threshold and rates in `lib/zakat.ts` as named constants with a comment on the source and the difference of opinion on the threshold's weight.", "Have the text reviewed by a maintainer."],
    done: ["Tests at, below and above the threshold, for both kinds of land", TESTS],
    files: ["lib/zakat.ts", "app/calculate/page.tsx"],
  }),

  /* ---------- business tools ---------- */
  T("code", "Teach the screener how more banks word interest", {
    why: "The purification audit finds interest and gambling by keyword. Banks word interest in many ways (\"INT PD\", \"GROSS INT\", \"PROFIT ON SAVINGS\"), and some Islamic banks call profit \"profit\", which must not be flagged.",
    todo: ["Collect real descriptions from five banks (from your own statements, anonymised), and add them as test fixtures.", "Extend the rules in `lib/business/screen.ts` so they are caught, and add exclusions for Islamic-bank profit wording.", "Every new pattern needs a test that matches it and one that must not."],
    done: ["Fixtures from at least five banks", TESTS],
    files: ["lib/business/screen.ts", "lib/business/screen.test.ts"],
  }),
  T("code", "Let a business add its own screening rules", {
    why: "Every business has its own vendors and wording. A user should be able to add a rule (\"anything from ACME LOANS is interest paid\") and have it applied with the built-in ones.",
    todo: ["Add a small rules editor to the audit: a phrase, which way the money moves, and what it is.", "Store custom rules in the browser like everything else.", "Keep custom rules out of the built-in list's tests."],
    done: ["A custom rule flags a matching transaction and appears in the export", TESTS],
    files: ["app/business/page.tsx", "lib/business/screen.ts"],
  }),
  T("code", "Keep a record of what was purified", {
    why: "Once a business has found income to purify, it needs to record what it gave away and when, so the books show it was done.",
    todo: ["Add a purification log to the audit: amount, date, recipient (free text), linked to the findings it covers.", "Show what has been purified against what was found."],
    done: ["Saved in the browser and included in the encrypted backup", TESTS],
    files: ["app/business/page.tsx", "lib/ (new)"],
  }),

  /* ---------- accounts and privacy ---------- */
  T("tests", "Test accounts end to end: register, sign in, vault round trip", {
    why: "Accounts encrypt in the browser and the server only stores ciphertext. Nothing tests the whole loop, so a change could quietly break restoring someone's figures.",
    todo: ["Test the route handlers in `app/api/account/` against the in-memory store: register, sign in with the right and wrong password, save a vault, read it back, delete the account.", "Test `lib/account.ts`'s encryption in Node's Web Crypto: what is sealed opens with the right key and fails with a wrong one."],
    done: ["The server never receives the password or plaintext in any test (assert on the request bodies)", TESTS],
    files: ["app/api/account/", "lib/account.ts", "lib/server/store.ts"],
  }),
  T("code", "Change password without losing the encrypted backup", {
    why: "The vault key comes from the password. Changing the password must re-encrypt the vault with the new key, or the backup becomes unreadable.",
    todo: ["Add a change-password form on the account page: derive the old and new keys, decrypt the vault with the old, re-encrypt with the new, and update the sign-in hash and vault together.", "Add the server route, requiring the old sign-in hash."],
    done: ["Tests for success, a wrong old password, and a failure between the two writes leaving the old password working"],
    files: ["lib/account.ts", "app/api/account/", "app/account/page.tsx"],
  }),

  /* ---------- zakat eligibility proofs ---------- */
  T("docs", "Design: proving you qualify for zakat without showing your finances", {
    why: "Recipients are asked to prove need by showing their finances, which costs them dignity. A zero-knowledge proof could show \"my wealth is below nisab\" to a distributor without showing a single figure. This issue is the design, before any code.",
    todo: ["Write `docs/eligibility-proofs.md`: who attests to the inputs (bank, employer, imam), what is proved, what the distributor sees, how a proof is tied to one person and one year, and what an attacker could try.", "Compare two toolchains (Noir and Circom) for running in a browser on a mid-range phone.", "List the open questions honestly."],
    done: ["Reviewed in the issue by a maintainer", "A clear recommendation of toolchain"],
    files: ["docs/ (new)"],
    hints: ["Start from the simplest statement: a sum of attested balances is below a public threshold."],
  }),
  T("code", "Prototype: a below-nisab proof that runs in the browser", {
    why: "The design above needs evidence that a proof can be made and checked on an ordinary phone in reasonable time.",
    todo: ["With the toolchain chosen in the design issue, write a circuit for: sum of private balances minus private debts is below a public nisab value.", "Generate and verify a proof in the browser; measure time and size on a phone.", "Keep it on a branch until the design is agreed."],
    done: ["A proof verifies, and a false claim (wealth above nisab) cannot produce one", "Timings in the issue"],
    files: ["(a branch: proofs/)"],
  }),

  /* ---------- quality ---------- */
  T("docs", "Update the README for currencies, accounts and the business tools", {
    why: "The README still describes a naira-only calculator with no accounts. It's the first thing a contributor reads.",
    todo: ["Describe what the app does now: home currency, statement import, accounts with in-browser encryption, the business tools.", "Explain the rules the project keeps: no prices are fetched, nothing leaves the device without an account, the calculator never rules where scholars differ."],
    done: ["Under about 120 lines", "Every claim matches the code"],
    files: ["README.md", "CONTRIBUTING.md"],
  }),
  T("code", "Money owed to you: strong and doubtful debts", {
    why: "Scholars distinguish debts you are confident of recovering (counted each year) from doubtful ones (often counted only when actually received, for one year). Today there is one field and everything in it counts.",
    todo: ["Split \"Money owed to you\" into \"likely to be repaid\" and \"doubtful\", with a choice of how to treat the doubtful part, both views named.", "Add the arithmetic to `lib/zakat.ts` with tests, and a Help topic."],
    done: ["Tests for both treatments", "The default never silently drops a debt the person expects back", "`pnpm test` passes"],
    files: ["lib/zakat.ts", "app/calculate/page.tsx", "components/app/HelpCenter.tsx"],
  }),
  T("code", "Zakat on livestock", {
    why: "For farming families, zakat on camels, cattle, sheep and goats follows its own tables (for example, one sheep for 40 to 120 sheep), not 2.5% of value, and it is easy to get wrong by hand.",
    todo: ["Encode the tables for sheep and goats, cattle, and camels from a named classical source, with the conditions (grazing animals held a year).", "Add a livestock tab that shows what is due in animals, with the matching table row.", "Have the tables checked by a maintainer before merging."],
    done: ["Tests at each table boundary for each animal", "`pnpm test` passes"],
    files: ["lib/ (new livestock.ts)", "app/calculate/page.tsx"],
  }),
  T("code", "Fill business zakat from a balance sheet", {
    why: "Businesses already have their trade assets in a balance sheet or their accounting software's export. Typing four totals by hand invites mistakes.",
    todo: ["Accept a balance sheet as CSV (account name, amount) and map common account names to cash, receivables, stock and current liabilities.", "Show the mapping for the user to correct before using it."],
    done: ["Tests with exports from two common accounting tools (QuickBooks and Xero formats)", "`pnpm test` passes"],
    files: ["app/business/page.tsx", "lib/business/ (new)"],
  }),
  T("code", "Purification audit: a summary by month", {
    why: "A business doing this monthly wants to see income to purify per month, not one total for every file it ever dropped in.",
    todo: ["Group the audit's findings by month, with a small table of income to purify and flagged spending per month.", "Include the monthly table in the CSV export."],
    done: ["Tests for grouping across a year boundary", "`pnpm test` passes"],
    files: ["lib/business/screen.ts", "app/business/page.tsx"],
  }),
];
