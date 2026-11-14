// House-specific: the content types the Collective's editors manage in the CMS.
// Each definition drives the CMS editor's forms, validation and storage; `seed` is today's built-in
// content, which also serves this api's read-only fallback when the CMS is unreachable.
import { EVENT_FORMATS, SEED_EVENTS } from "./events.js";
import { SEED_FAQ } from "./faq.js";
import { MEMBER_HOUSE_IDS, SEED_HOUSE_PROFILES } from "./houseProfiles.js";
import { HOUSES } from "./houses.js";
import { NEWS_KINDS, SEED_NEWS } from "./news.js";
import { SEED_CONTACT, SEED_GIVING, SEED_JOIN, SEED_MOBILE, SEED_PRESS } from "./pages.js";
import { SEED_POLICIES } from "./policies.js";
import { PRODUCT_STATUSES, SEED_PRODUCTS } from "./products.js";
import { SEED_REVIEWS } from "./reviews.js";
import { RFP_STATUSES, SEED_RFPS } from "./rfps.js";
import { SEED_SUGGEST } from "./suggestions.js";
import { SEED_PRINCIPLES } from "./principles.js";
import { SEED_TEAM } from "./team.js";
import type { CollectionDef, Field, SpaceLink } from "./types.js";

const HOUSE_IDS = HOUSES.map((h) => h.id);
const PRODUCT_IDS = SEED_PRODUCTS.map((p) => p.slug);
const rows = (x: unknown) => x as Record<string, unknown>[];

const roleFields: Field[] = [
  { type: "text", name: "title", label: "Role", required: true },
  { type: "text", name: "name", label: "Name", help: "Leave empty to show “Name to be announced” until the person has agreed to be listed." },
  { type: "select", name: "house", label: "House", options: HOUSE_IDS, help: "Sets the star shown on the card. Leave empty for the Collective." },
  { type: "textarea", name: "remit", label: "Remit", required: true, rows: 2 },
];

const titledText = (name: string, label: string, itemLabel: string): Field => ({
  type: "list", name, label, itemLabel, itemTitle: "title", required: true,
  fields: [
    { type: "text", name: "title", label: "Title", required: true },
    { type: "textarea", name: "body", label: "Text", required: true, rows: 2 },
  ],
});

const linkField = (help?: string): Field => ({
  type: "object", name: "link", label: "Link", help,
  fields: [
    { type: "text", name: "label", label: "Link text", placeholder: "Read more →" },
    { type: "url", name: "href", label: "Link address", placeholder: "/join" },
  ],
});

export const COLLECTIONS: CollectionDef[] = [
  {
    name: "events",
    label: "Gatherings",
    singular: "Gathering",
    description: "The Majlis, the Sprint, the Reading Circle and other gatherings. The first three appear on the home page.",
    idField: "slug",
    titleField: "title",
    columns: ["hostLabel", "cadence", "format"],
    seed: () => rows(SEED_EVENTS),
    fields: [
      { type: "text", name: "slug", label: "Slug", required: true, help: "Appears in the address: /events/slug." },
      { type: "text", name: "title", label: "Title", required: true },
      { type: "tags", name: "hosts", label: "Host houses", required: true, help: `Comma-separated, from: ${HOUSE_IDS.join(", ")}. The first sets the star on the gathering page.` },
      { type: "text", name: "hostLabel", label: "Hosted by", required: true, placeholder: "Research × Institute" },
      { type: "text", name: "cadence", label: "Cadence", required: true, placeholder: "Monthly" },
      { type: "select", name: "format", label: "Format", required: true, options: EVENT_FORMATS },
      { type: "text", name: "date", label: "Date", required: true, help: "Free text, e.g. “TBA” or “14 March 2027”." },
      { type: "text", name: "location", label: "Where", required: true },
      { type: "textarea", name: "summary", label: "Summary", required: true, rows: 2, help: "One sentence for lists and the home page." },
      { type: "paragraphs", name: "body", label: "Description", required: true },
      { type: "lines", name: "agenda", label: "Shape of the day", help: "One item per line." },
      { type: "textarea", name: "forWhom", label: "Who it’s for", required: true, rows: 2 },
    ],
  },
  {
    name: "news",
    label: "News",
    singular: "Post",
    description: "Announcements, notes and open calls. The first post leads the News page.",
    idField: "slug",
    titleField: "title",
    columns: ["kind", "date"],
    seed: () => rows(SEED_NEWS),
    fields: [
      { type: "text", name: "slug", label: "Slug", required: true, help: "Appears in the address: /news/slug." },
      { type: "text", name: "title", label: "Title", required: true },
      { type: "select", name: "kind", label: "Kind", required: true, options: NEWS_KINDS },
      { type: "text", name: "date", label: "Date", required: true, help: "As it should appear, e.g. “12 May 2027”." },
      { type: "textarea", name: "summary", label: "Summary", required: true, rows: 2 },
      {
        type: "list", name: "body", label: "Body", itemLabel: "section", itemTitle: "heading", required: true,
        fields: [
          { type: "text", name: "heading", label: "Heading", help: "Optional." },
          { type: "textarea", name: "text", label: "Text", required: true, rows: 4 },
        ],
      },
    ],
  },
  {
    name: "principles",
    label: "Principles",
    singular: "Principle",
    description: "The four principles: short form on the home page, in depth on About.",
    idField: "slug",
    titleField: "name",
    columns: ["en"],
    seed: () => rows(SEED_PRINCIPLES),
    fields: [
      { type: "text", name: "slug", label: "Slug", required: true, help: "Anchor on the About page, e.g. /about#amanah." },
      { type: "text", name: "name", label: "Name (transliterated)", required: true, placeholder: "Amānah" },
      { type: "text", name: "ar", label: "Arabic", required: true, help: "Have a native speaker check it." },
      { type: "text", name: "en", label: "English gloss", required: true, placeholder: "Trust" },
      { type: "text", name: "root", label: "Root", required: true },
      { type: "textarea", name: "body", label: "Short form", required: true, rows: 2, help: "Shown on the home page." },
      { type: "paragraphs", name: "long", label: "In depth", required: true },
      { type: "lines", name: "practice", label: "In practice", required: true, help: "One commitment per line." },
    ],
  },
  {
    name: "houses",
    label: "Houses",
    singular: "House",
    description: "How each house introduces itself on the hub. Names, Arabic word-signs and URLs are brand constants in code.",
    idField: "id",
    titleField: "label",
    columns: ["title", "email"],
    seed: () => rows(SEED_HOUSE_PROFILES),
    fields: [
      { type: "select", name: "id", label: "House", required: true, options: MEMBER_HOUSE_IDS },
      { type: "text", name: "label", label: "Label", required: true, placeholder: "AI at ITC" },
      { type: "text", name: "title", label: "Line", required: true, help: "The house’s own voice line." },
      { type: "textarea", name: "desc", label: "Description", required: true, rows: 2 },
      { type: "lines", name: "focus", label: "Focus", required: true, help: "One per line." },
      {
        type: "list", name: "collaborates", label: "Works with", itemLabel: "house", itemTitle: "with",
        fields: [
          { type: "select", name: "with", label: "House", required: true, options: MEMBER_HOUSE_IDS },
          { type: "textarea", name: "how", label: "How", required: true, rows: 2, help: "Completes the sentence “… which …”." },
        ],
      },
      { type: "email", name: "email", label: "Contact email", required: true },
    ],
  },
  {
    name: "faq",
    label: "Questions",
    singular: "Question",
    description: "The FAQ page, in order.",
    idField: "slug",
    titleField: "q",
    seed: () => rows(SEED_FAQ),
    fields: [
      { type: "text", name: "slug", label: "Slug", required: true },
      { type: "text", name: "q", label: "Question", required: true },
      { type: "textarea", name: "a", label: "Answer", required: true, rows: 4 },
      linkField("Optional link shown after the answer."),
    ],
  },
  {
    name: "policies",
    label: "Policies",
    singular: "Policy",
    description: "Draft privacy policy and terms of use, shared by all six sites.",
    idField: "slug",
    titleField: "title",
    seed: () => rows(SEED_POLICIES),
    fields: [
      { type: "text", name: "slug", label: "Slug", required: true, help: "Keep as “privacy” or “terms”: these are shown at /privacy and /terms." },
      { type: "text", name: "title", label: "Title", required: true },
      { type: "text", name: "metaTitle", label: "Browser tab title", required: true },
      { type: "textarea", name: "description", label: "Search description", required: true, rows: 2 },
      { type: "textarea", name: "intro", label: "Introduction", required: true, rows: 2 },
      {
        type: "list", name: "sections", label: "Sections", itemLabel: "section", itemTitle: "heading", required: true,
        fields: [
          { type: "text", name: "heading", label: "Heading", required: true },
          { type: "paragraphs", name: "body", label: "Paragraphs", required: true },
        ],
      },
    ],
  },
  {
    name: "team",
    label: "Team",
    singular: "Team",
    description: "Leadership, house stewards and councils on the Team page.",
    idField: "id",
    titleField: "id",
    singleton: true,
    seed: () => rows([SEED_TEAM]),
    fields: [
      { type: "text", name: "id", label: "Id", required: true, help: "Leave as “team”." },
      { type: "list", name: "leadership", label: "Leadership", itemLabel: "role", itemTitle: "title", fields: roleFields },
      { type: "list", name: "stewards", label: "House stewards", itemLabel: "role", itemTitle: "title", fields: roleFields },
      {
        type: "list", name: "councils", label: "Councils", itemLabel: "council", itemTitle: "title",
        fields: [
          { type: "text", name: "title", label: "Council", required: true },
          { type: "textarea", name: "remit", label: "Remit", required: true, rows: 2 },
        ],
      },
    ],
  },
  {
    name: "join",
    label: "Join page",
    singular: "Join page",
    description: "The ways to take part, shown on /join.",
    idField: "id",
    titleField: "id",
    singleton: true,
    seed: () => rows([SEED_JOIN]),
    fields: [
      { type: "text", name: "id", label: "Id", required: true, help: "Leave as “join”." },
      {
        type: "list", name: "ways", label: "Ways to take part", itemLabel: "way", itemTitle: "title", required: true,
        fields: [
          { type: "text", name: "title", label: "Title", required: true },
          { type: "textarea", name: "body", label: "Text", required: true, rows: 3 },
          { type: "text", name: "gives", label: "What it asks", required: true },
          linkField("Optional."),
        ],
      },
    ],
  },
  {
    name: "giving",
    label: "Support page",
    singular: "Support page",
    description: "How support is used and the ways to give, shown on /donate.",
    idField: "id",
    titleField: "id",
    singleton: true,
    seed: () => rows([SEED_GIVING]),
    fields: [
      { type: "text", name: "id", label: "Id", required: true, help: "Leave as “giving”." },
      titledText("uses", "How support is used", "use"),
      titledText("options", "Ways to give", "option"),
      { type: "email", name: "email", label: "Giving email", required: true },
      { type: "textarea", name: "note", label: "Note under the button", rows: 2 },
      { type: "paragraphs", name: "notice", label: "A note on zakat and tax status", required: true },
    ],
  },
  {
    name: "rfps",
    label: "Requests for proposals",
    singular: "RFP",
    description: "Work the Collective wants built, put out as a public brief. Shown on /rfps, one page each.",
    idField: "slug",
    titleField: "title",
    columns: ["status", "house", "closes"],
    seed: () => rows(SEED_RFPS),
    fields: [
      { type: "text", name: "slug", label: "Slug", required: true, help: "Appears in the address: /rfps/slug." },
      { type: "text", name: "title", label: "Title", required: true },
      { type: "select", name: "house", label: "Stewarding house", required: true, options: HOUSE_IDS, help: "Whose team answers questions and holds the relationship." },
      { type: "select", name: "status", label: "Status", required: true, options: RFP_STATUSES },
      { type: "text", name: "budget", label: "Budget", required: true, help: "Say it plainly, e.g. “£15,000–£25,000” or “To be agreed”. Never hide a number." },
      { type: "text", name: "closes", label: "Closes", required: true, help: "Free text, e.g. “28 February 2027” or “Rolling”." },
      { type: "text", name: "duration", label: "Expected duration", required: true, placeholder: "Six to nine months" },
      { type: "textarea", name: "summary", label: "Summary", required: true, rows: 2, help: "One sentence for the list page." },
      { type: "paragraphs", name: "need", label: "The need", required: true, help: "Who is underserved today, and what changes for them." },
      { type: "lines", name: "scope", label: "Scope", required: true, help: "What a proposal must cover. One item per line." },
      { type: "lines", name: "criteria", label: "How proposals are judged", required: true, help: "In order of weight. One per line." },
      { type: "lines", name: "conditions", label: "Conditions", required: true, help: "Non-negotiables: licence, data handling, accessibility, review. One per line." },
      {
        type: "list", name: "sections", label: "Further sections", itemLabel: "section", itemTitle: "heading",
        help: "Optional. Use for “How to propose”, timelines, or anything this brief needs that the fields above don’t cover.",
        fields: [
          { type: "text", name: "heading", label: "Heading", required: true },
          { type: "paragraphs", name: "body", label: "Paragraphs", required: true },
        ],
      },
    ],
  },
  {
    name: "products",
    label: "Products",
    singular: "Product",
    description: "Shown on /products, one page each. The repo/download URL doubles as \"access\" until there's a hosted app.",
    idField: "slug",
    titleField: "name",
    columns: ["status"],
    seed: () => rows(SEED_PRODUCTS),
    fields: [
      { type: "text", name: "slug", label: "Slug", required: true, help: "Appears in the address: /products/slug." },
      { type: "text", name: "name", label: "Name", required: true },
      { type: "text", name: "tagline", label: "Tagline", required: true, help: "One sentence, shown on the card." },
      { type: "select", name: "status", label: "Status", required: true, options: PRODUCT_STATUSES },
      { type: "textarea", name: "summary", label: "Summary", required: true, rows: 2, help: "One or two sentences for the list page." },
      { type: "paragraphs", name: "body", label: "Description", required: true },
      { type: "lines", name: "features", label: "Features", help: "One per line." },
      { type: "url", name: "repoUrl", label: "Repository / download URL", help: "GitHub repo, or wherever it can be downloaded from." },
      { type: "url", name: "liveUrl", label: "Live URL", help: "A hosted version, if there is one." },
    ],
  },
  {
    name: "reviews",
    label: "Product reviews",
    singular: "Review",
    description: "Published reviews, shown under a product on its /products/[slug] page. Promote a good submission from the inbox here.",
    idField: "id",
    titleField: "name",
    columns: ["product", "rating", "name"],
    seed: () => rows(SEED_REVIEWS),
    fields: [
      { type: "text", name: "id", label: "Id", required: true },
      { type: "select", name: "product", label: "Product", required: true, options: PRODUCT_IDS },
      { type: "text", name: "name", label: "Name", required: true, help: "First name or handle is fine." },
      { type: "number", name: "rating", label: "Rating", required: true, min: 1, max: 5 },
      { type: "textarea", name: "body", label: "Review", required: true, rows: 3 },
      { type: "text", name: "date", label: "Date", required: true, help: "YYYY-MM-DD." },
    ],
  },
  {
    name: "suggest",
    label: "Suggestions page",
    singular: "Suggestions page",
    description: "The copy on /suggest, where people tell us what to build. The suggestions themselves arrive in the inbox.",
    idField: "id",
    titleField: "id",
    singleton: true,
    seed: () => rows([SEED_SUGGEST]),
    fields: [
      { type: "text", name: "id", label: "Id", required: true, help: "Leave as “suggest”." },
      { type: "text", name: "headline", label: "Headline", required: true },
      { type: "textarea", name: "intro", label: "Introduction", required: true, rows: 4 },
      {
        type: "list", name: "prompts", label: "What to tell us", itemLabel: "prompt", itemTitle: "title", required: true,
        help: "Questions that help someone describe a need rather than a feature.",
        fields: [
          { type: "text", name: "title", label: "Question", required: true },
          { type: "textarea", name: "body", label: "Explanation", required: true, rows: 2 },
        ],
      },
      {
        type: "list", name: "steps", label: "What happens next", itemLabel: "step", itemTitle: "title", required: true,
        fields: [
          { type: "text", name: "title", label: "Step", required: true },
          { type: "textarea", name: "body", label: "Text", required: true, rows: 2 },
        ],
      },
      { type: "lines", name: "areas", label: "Areas of need", required: true, help: "Options in the form’s “What is this about?” menu, one per line." },
      { type: "lines", name: "outOfScope", label: "What we won’t take on", required: true, help: "Said plainly, so nobody wastes their time. One per line." },
      { type: "textarea", name: "privacy", label: "Privacy note", required: true, rows: 3, help: "Shown under the form." },
    ],
  },
  {
    name: "contact",
    label: "Contact page",
    singular: "Contact page",
    description: "General addresses and the contact form’s topics. House addresses are edited under Houses.",
    idField: "id",
    titleField: "id",
    singleton: true,
    seed: () => rows([SEED_CONTACT]),
    fields: [
      { type: "text", name: "id", label: "Id", required: true, help: "Leave as “contact”." },
      {
        type: "list", name: "channels", label: "General addresses", itemLabel: "address", itemTitle: "label", required: true,
        fields: [
          { type: "text", name: "label", label: "Label", required: true },
          { type: "email", name: "email", label: "Email", required: true },
        ],
      },
      { type: "lines", name: "topics", label: "Form topics", required: true, help: "Options in “Who is this for?”, one per line." },
    ],
  },
  {
    name: "press",
    label: "Press page",
    singular: "Press page",
    description: "Press contact and brand-kit notes. The palette and typefaces are brand constants in code.",
    idField: "id",
    titleField: "id",
    singleton: true,
    seed: () => rows([SEED_PRESS]),
    fields: [
      { type: "text", name: "id", label: "Id", required: true, help: "Leave as “press”." },
      { type: "email", name: "email", label: "Press email", required: true },
      {
        type: "list", name: "centers", label: "What each center means", itemLabel: "center", itemTitle: "house",
        fields: [
          { type: "select", name: "house", label: "House", required: true, options: HOUSE_IDS },
          { type: "text", name: "text", label: "Meaning", required: true },
        ],
      },
      { type: "lines", name: "donts", label: "Please don’t", help: "One per line." },
      { type: "textarea", name: "guidelines", label: "Brand guidelines note", rows: 3 },
    ],
  },
  {
    name: "mobile",
    label: "Mobile page",
    singular: "Mobile page",
    description: "The page for the contributor app. Leave the store links empty until the listings exist \u2014 the page then says the app is not published yet rather than linking nowhere.",
    idField: "id",
    titleField: "id",
    singleton: true,
    seed: () => rows([SEED_MOBILE]),
    fields: [
      { type: "text", name: "id", label: "Id", required: true, help: "Leave as \u201cmobile\u201d." },
      { type: "textarea", name: "lede", label: "Lede", rows: 3, required: true },
      {
        type: "list", name: "features", label: "What it does", itemLabel: "feature", itemTitle: "title",
        fields: [
          { type: "text", name: "title", label: "Title", required: true },
          { type: "textarea", name: "body", label: "Body", rows: 3, required: true },
        ],
      },
      { type: "lines", name: "notYet", label: "What it deliberately does not do", help: "One per line." },
      { type: "url", name: "appStoreUrl", label: "App Store link", help: "Leave empty until the listing exists." },
      { type: "url", name: "playStoreUrl", label: "Google Play link", help: "Leave empty until the listing exists." },
      { type: "textarea", name: "betaNote", label: "Note shown while the stores are empty", rows: 3 },
    ],
  },
];

/** Names of the public forms whose submissions land in the inbox. */
export const FORMS: Record<string, string> = {
  join: "Join: expression of interest",
  "rfp-proposal": "RFPs: proposal",
  suggestion: "Suggestions: what to build",
  invite: "Home: invitation request",
  contact: "Contact: message",
  "product-review": "Products: review",
};

export function getCollection(name: string): CollectionDef {
  const def = COLLECTIONS.find((c) => c.name === name);
  if (!def) throw new Error(`Unknown collection: ${name}`);
  return def;
}

export const findCollection = (name: string) => COLLECTIONS.find((c) => c.name === name);

/** Extra pages this space's sidebar in cms/web links to. */
export const LINKS: SpaceLink[] = [];
