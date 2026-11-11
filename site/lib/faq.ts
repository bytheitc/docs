// Frequently asked questions, shown on /faq.
export interface FaqItem {
  slug: string;
  q: string;
  a: string;
  /** Optional link shown after the answer. */
  link?: { label: string; href: string };
}

/** Built-in content: seeds the database and serves as the fallback when none is connected. */
export const SEED_FAQ: FaqItem[] = [
  { slug: "muslim", q: "Do I need to be Muslim to take part?", a: "No. Our principles come from the Islamic tradition, and we are open about that. Anyone who shares the work and respects the values it is built on is welcome." },
  { slug: "engineer", q: "Do I need to be an engineer?", a: "Not at all. Writers, designers, teachers, researchers, organisers and translators are all part of the collective. Every house has work that isn’t code." },
  { slug: "house", q: "What is a “house”?", a: "A house is one part of the collective with its own focus, people and site: AI, Engineering, the Institute, Open Source and Research.", link: { label: "Meet the houses →", href: "/houses" } },
  { slug: "cost", q: "Does membership cost anything?", a: "No. Membership is free. Terms are still being drafted and will be published for comment before they take effect." },
  { slug: "decisions", q: "How are decisions made?", a: "By consultation (shūrā). Significant decisions start as a written proposal, invite comment from the people affected, and are decided by the collective council with reasons published.", link: { label: "See the councils →", href: "/team" } },
  { slug: "next-gathering", q: "When is the next gathering?", a: "Dates are still being set. Join to hear first.", link: { label: "See the gatherings →", href: "/events" } },
  { slug: "partner", q: "Can my organisation partner with you?", a: "Yes, where the work fits our principles. Choose “Partner” on the Join page and tell us what you have in mind.", link: { label: "Go to the Join page →", href: "/join" } },
  { slug: "zakat", q: "Can I give my zakat to the Collective?", a: "Not yet. We are seeking scholarly guidance first.", link: { label: "Read more on the Support page →", href: "/donate" } },
  { slug: "arabic", q: "What do the Arabic words on each site mean?", a: "Each house carries one word: jamāʿa (the collective), dhakāʾ (intelligence), handasa (engineering, and also geometry), maʿhad (institute), mashāʿ (the commons) and baḥth (research). They are always shown with their meaning." },
];
