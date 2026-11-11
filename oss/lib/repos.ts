// Seed content for the repository registry: the built-in repos, editable in the admin (Repositories).
// Package names, commands and APIs below are illustrative: nothing here is published yet.
// Later the contributor portal will supply live repo and issue data; until then this is CMS content.
import { house, type HouseId } from "@/lib/houses";

export const LANGS = ["TypeScript", "Python", "Go", "Rust"] as const;
export type Lang = (typeof LANGS)[number];

export interface Maintainer {
  role: string;
  name: string; // "TBA" until a real person signs up
}

/** A good first issue as stored with its repo. */
export interface RepoIssue {
  title: string;
  label: string;
  /** Shown in "good first issues" on the home page. */
  featured?: boolean;
  /** The GitHub issue number, once the issue exists. Enables claiming on the contributor portal. */
  number?: number;
}

/** A good first issue with the slug of the repo it belongs to. */
export interface Issue extends RepoIssue {
  repo: string;
}

export interface Snippet {
  lang: string; // shown in the code block header
  code: string;
}

/** A repo as stored in the CMS. */
export interface RepoRecord {
  slug: string;
  name: string;
  desc: string;
  lang: Lang;
  license: string;
  houseId: HouseId;
  /** Long-form README-style overview, one string per paragraph. */
  overview: string[];
  features: string[];
  install: Snippet;
  usage: Snippet;
  maintainers: Maintainer[];
  issues: RepoIssue[];
}

/** A repo as pages use it: owning house name and issue repo slugs filled in. */
export interface Repo extends Omit<RepoRecord, "issues"> {
  house: string;
  issues: Issue[];
}

const TBA_MAINTAINERS: Maintainer[] = [
  { role: "Lead maintainer", name: "TBA" },
  { role: "Reviewer", name: "TBA" },
  { role: "Docs & triage", name: "TBA" },
];

// Hand-picked issues featured on the home page.
const FEATURED = [
  "Mirror icon direction automatically in RTL layouts",
  "Add Urdu and Malay month names",
  "Document high-latitude adjustment options",
  "Add a 10-point star construction",
  "Write tests for the gold nisab threshold",
];

const issues = (list: [string, string][]): RepoIssue[] =>
  list.map(([title, label]) => (FEATURED.includes(title) ? { title, label, featured: true } : { title, label }));

export const SEED_REPOS: RepoRecord[] = [
  {
    slug: "isnad-rag",
    name: "isnad-rag",
    desc: "Retrieval-augmented generation where every answer carries a traceable chain of citation.",
    lang: "Python",
    license: "Apache-2.0",
    houseId: "ai",
    overview: [
      "An isnad is a chain of transmission: who heard it from whom, all the way back to the source. isnad-rag applies the same discipline to retrieval-augmented generation. Every generated claim is tied to the passages it came from, and every passage is tied to the document, edition and page it was cut from.",
      "If the chain breaks, the answer says so. No citation, no claim. The library is model-agnostic: bring any embedding model and any LLM, and isnad-rag handles chunking, retrieval, attribution and the final audit trail.",
    ],
    features: [
      "Span-level citations: every sentence in an answer points at the exact source span",
      "Pluggable embedders, vector stores and LLM backends",
      "An audit report you can export as JSON alongside each answer",
      "Refuses to answer when retrieval confidence is below your threshold",
    ],
    install: { lang: "shell", code: "pip install isnad-rag" },
    usage: {
      lang: "python",
      code: `from isnad_rag import Corpus, Answerer

corpus = Corpus.from_dir("./sources", chunk_size=400)
answerer = Answerer(corpus, min_confidence=0.6)

result = answerer.ask("What does the source say about weights and measures?")
print(result.text)
for c in result.citations:
    print(c.source, c.page, c.span)`,
    },
    maintainers: TBA_MAINTAINERS,
    issues: issues([
      ["Add a Markdown loader that keeps heading hierarchy", "feature"],
      ["Explain the audit JSON schema in the docs", "docs"],
      ["Test refusal behaviour when the corpus is empty", "tests"],
      ["Show citation spans in the CLI output with colour", "dx"],
    ]),
  },
  {
    slug: "mizan-ui",
    name: "mizan-ui",
    desc: "The ITC design system: accessible, RTL-first React components.",
    lang: "TypeScript",
    license: "MIT",
    houseId: "engineering",
    overview: [
      "Mizan means balance. mizan-ui is a React component library built RTL-first: every component is designed and tested in Arabic, Urdu and Persian layouts before it is checked in English. Logical CSS properties throughout, so direction is never an afterthought.",
      "Accessibility is a release blocker, not a backlog item. Every component ships with keyboard support, screen-reader labels and a documented contrast budget.",
    ],
    features: [
      "Logical properties only: no left/right in the stylesheet",
      "Keyboard and screen-reader support on every interactive component",
      "Themeable with CSS custom properties, no runtime CSS-in-JS",
      "Tree-shakeable ESM build",
    ],
    install: { lang: "shell", code: "npm install @itc/mizan-ui" },
    usage: {
      lang: "tsx",
      code: `import { MizanProvider, Button, Field } from "@itc/mizan-ui";
import "@itc/mizan-ui/styles.css";

export function App() {
  return (
    <MizanProvider dir="rtl" locale="ar">
      <Field label="الاسم" name="name" />
      <Button variant="primary">إرسال</Button>
    </MizanProvider>
  );
}`,
    },
    maintainers: TBA_MAINTAINERS,
    issues: issues([
      ["Mirror icon direction automatically in RTL layouts", "a11y"],
      ["Add a visible focus ring token to the theme", "a11y"],
      ["Write Storybook stories for the Tabs component in RTL", "docs"],
      ["Support Persian digits in the NumberField", "i18n"],
      ["Replace margin-left in Tooltip with a logical property", "bug"],
      ["Add a dark theme example to the README", "docs"],
      ["Test Dialog focus trap with keyboard only", "tests"],
    ]),
  },
  {
    slug: "salah-times",
    name: "salah-times",
    desc: "Prayer-time computation with every major calculation method, no network required.",
    lang: "Rust",
    license: "MIT",
    houseId: "engineering",
    overview: [
      "salah-times computes the five daily prayer times, plus sunrise and the night thirds, from latitude, longitude, date and a calculation method. It runs fully offline, has no runtime dependencies, and compiles to WebAssembly for the browser.",
      "Calculation methods, juristic settings for Asr and high-latitude rules are explicit inputs. Nothing is hidden behind a default you can't see.",
    ],
    features: [
      "All major calculation methods as named presets, plus fully custom angles",
      "High-latitude adjustment rules for places where twilight never ends",
      "no_std compatible core; WASM bindings included",
      "Property-tested against reference tables",
    ],
    install: { lang: "shell", code: "cargo add salah-times" },
    usage: {
      lang: "rust",
      code: `use salah_times::{Coordinates, Method, Madhab, PrayerTimes};
use chrono::NaiveDate;

fn main() {
    let here = Coordinates::new(21.4225, 39.8262);
    let date = NaiveDate::from_ymd_opt(2026, 3, 1).unwrap();
    let times = PrayerTimes::new(here, date, Method::UmmAlQura, Madhab::Shafi);

    println!("fajr    {}", times.fajr);
    println!("maghrib {}", times.maghrib);
}`,
    },
    maintainers: TBA_MAINTAINERS,
    issues: issues([
      ["Document high-latitude adjustment options", "docs"],
      ["Add a CLI example that prints a month as a table", "feature"],
      ["Publish WASM bindings example for the browser", "docs"],
    ]),
  },
  {
    slug: "hijri-kit",
    name: "hijri-kit",
    desc: "Hijri ⇄ Gregorian conversion and formatting for JS runtimes.",
    lang: "TypeScript",
    license: "MIT",
    houseId: "engineering",
    overview: [
      "hijri-kit converts between Hijri and Gregorian dates and formats them for humans. It works in Node, Deno, Bun and the browser with zero dependencies, and it plays nicely with Intl where the runtime supports it.",
      "Conversion tables are pluggable, because different communities follow different calendars. The library tells you which table produced a date so you can show it honestly.",
    ],
    features: [
      "Two-way conversion with selectable tables",
      "Locale-aware month and weekday names",
      "Immutable date objects, no global state",
      "Ships ESM and CJS with full type definitions",
    ],
    install: { lang: "shell", code: "npm install @itc/hijri-kit" },
    usage: {
      lang: "ts",
      code: `import { toHijri, toGregorian, format } from "@itc/hijri-kit";

const h = toHijri(new Date("2026-03-01"));
console.log(format(h, "d MMMM yyyy", { locale: "ar" }));

const g = toGregorian({ year: 1448, month: 9, day: 1 });
console.log(g.toISOString());`,
    },
    maintainers: TBA_MAINTAINERS,
    issues: issues([
      ["Add Urdu and Malay month names", "i18n"],
      ["Add Turkish and Indonesian month names", "i18n"],
      ["Document how to plug in a custom conversion table", "docs"],
      ["Add a round-trip property test for conversions", "tests"],
      ["Expose the source table on formatted output", "feature"],
    ]),
  },
  {
    slug: "arabic-norm",
    name: "arabic-norm",
    desc: "Normalization, diacritic handling and tokenization for Arabic text.",
    lang: "Python",
    license: "Apache-2.0",
    houseId: "research",
    overview: [
      "arabic-norm is the boring, careful step before any Arabic NLP: unify alef and yaa variants, strip or keep tashkeel on purpose, handle tatweel, and split text into tokens that respect clitics.",
      "Every transformation is a named, reversible step. You choose the pipeline, and the library logs what it changed so results can be reproduced and reviewed.",
    ],
    features: [
      "Composable normalisation steps with a change log",
      "Diacritic strip, keep or restore-from-reference modes",
      "Clitic-aware tokenizer",
      "Pure Python, with optional speedups",
    ],
    install: { lang: "shell", code: "pip install arabic-norm" },
    usage: {
      lang: "python",
      code: `from arabic_norm import Pipeline, steps

pipe = Pipeline([
    steps.unify_alef(),
    steps.strip_tatweel(),
    steps.strip_diacritics(keep_shadda=True),
])

out = pipe("الْعِلْمُ نُورٌ")
print(out.text)
print(out.changes)  # what was changed, and where`,
    },
    maintainers: TBA_MAINTAINERS,
    issues: issues([
      ["Add a step that normalises Persian kaf and yeh", "feature"],
      ["Write a docs page comparing normalisation presets", "docs"],
    ]),
  },
  {
    slug: "zakat-calc",
    name: "zakat-calc",
    desc: "A zakat calculator library with configurable positions from different schools of thought.",
    lang: "TypeScript",
    license: "MIT",
    houseId: "institute",
    overview: [
      "zakat-calc is a calculation library, not a fatwa. It encodes the common positions of different schools of thought as explicit, documented options, and it shows its working so a person can check every step with a scholar they trust.",
      "Asset categories, nisab basis (gold or silver), and treatment of debts are all inputs. Defaults are deliberately absent: the caller must choose.",
    ],
    features: [
      "Explicit configuration for each juristic choice, with sources in the docs",
      "Step-by-step breakdown of every calculation",
      "Currency-agnostic: you supply metal prices and exchange rates",
      "No network calls, no data collection",
    ],
    install: { lang: "shell", code: "npm install @itc/zakat-calc" },
    usage: {
      lang: "ts",
      code: `import { calculate } from "@itc/zakat-calc";

const result = calculate({
  nisabBasis: "silver",
  prices: { goldPerGram: 0, silverPerGram: 0 }, // supply today's prices
  assets: { cash: 0, gold: 0, tradeGoods: 0 },
  liabilities: { dueWithinYear: 0 },
});

console.log(result.due, result.steps);`,
    },
    maintainers: TBA_MAINTAINERS,
    issues: issues([
      ["Write tests for the gold nisab threshold", "tests"],
      ["Write tests for the silver nisab threshold", "tests"],
      ["Document each configuration option with its source", "docs"],
      ["Add a plain-language explanation to each calculation step", "docs"],
      ["Validate negative inputs and return a helpful error", "bug"],
      ["Add an example form built with mizan-ui", "feature"],
    ]),
  },
  {
    slug: "khatam",
    name: "khatam",
    desc: "Generate construction-true Islamic geometric patterns as SVG.",
    lang: "TypeScript",
    license: "MIT",
    houseId: "site",
    overview: [
      "khatam builds Islamic geometric patterns the way craftspeople always have: compass and straightedge, step by step. Each pattern is a construction, a list of circles, lines and intersections, so the output is exact and the steps can be animated or taught.",
      "It is the library behind the ITC mark. Start from a star, choose a repeat, and export clean SVG with no random ornament.",
    ],
    features: [
      "Construction API: circles, lines, intersections, no magic numbers",
      "8-, 12- and 16-point stars with tiling repeats",
      "Clean, minimal SVG output",
      "Step export, for teaching and animation",
    ],
    install: { lang: "shell", code: "npm install @itc/khatam" },
    usage: {
      lang: "ts",
      code: `import { star, tile, toSVG } from "@itc/khatam";

const s = star({ points: 8, radius: 50 });
const pattern = tile(s, { repeat: "square", cols: 4, rows: 4 });

document.body.innerHTML = toSVG(pattern, { stroke: "#C6F432" });`,
    },
    maintainers: TBA_MAINTAINERS,
    issues: issues([
      ["Add a 10-point star construction", "feature"],
      ["Add a step-by-step construction page to the docs", "docs"],
      ["Snapshot-test SVG output for the 8-point star", "tests"],
    ]),
  },
  {
    slug: "bayt",
    name: "bayt",
    desc: "One-command local dev environments for every ITC service.",
    lang: "Go",
    license: "Apache-2.0",
    houseId: "engineering",
    overview: [
      "bayt means home. It is a single binary that reads a bayt.toml in any ITC repo and brings up everything that repo needs: runtimes, databases, seed data and env vars. One command, every repo, every machine.",
      "If a repo needs more than `bayt up` to start, that's a bug. File it.",
    ],
    features: [
      "One config file per repo, checked in",
      "Reproducible toolchains pinned per project",
      "Works on macOS, Linux and WSL",
      "`bayt doctor` explains what's missing and how to fix it",
    ],
    install: { lang: "shell", code: "go install github.com/TODO-itc-oss/bayt@latest" },
    usage: {
      lang: "shell",
      code: `cd mizan-ui
bayt doctor   # check your machine
bayt up       # install toolchain, start services, seed data
bayt test     # run the repo's test suite
bayt down     # stop everything`,
    },
    maintainers: TBA_MAINTAINERS,
    issues: issues([
      ["Print a friendlier error when Docker isn't running", "dx"],
      ["Add fish shell completions", "feature"],
    ]),
  },
];

/** Fills in what pages derive from a stored repo. */
export const toRepo = (r: RepoRecord): Repo => ({
  ...r,
  house: house(r.houseId).name,
  issues: (r.issues ?? []).map((i) => ({ ...i, repo: r.slug })),
});

export const findRepo = (repos: Repo[], slug: string): Repo | undefined => repos.find((r) => r.slug === slug);

export const allIssues = (repos: Repo[]): Issue[] => repos.flatMap((r) => r.issues);

export const featuredIssues = (repos: Repo[]): Issue[] => allIssues(repos).filter((i) => i.featured);
