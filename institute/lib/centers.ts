// The Institute's centers. Placeholder roster: replace with the real centers before launch.
// Seed content for the "centers" collection (lib/cms/collections.ts). Pages read the published list via lib/data.ts.

export type Area = "Knowledge" | "Society" | "Practice";
export const AREAS: Area[] = ["Knowledge", "Society", "Practice"];

export interface Program {
  name: string;
  body: string;
}

export interface FellowSeat {
  role: string;
  /** Always a placeholder until the roster is confirmed. */
  name: string;
}

export interface Output {
  kind: string;
  title: string;
  body: string;
}

export interface Center {
  slug: string;
  name: string;
  arabic: string;
  translit: string;
  /** English sense of the Arabic word-sign. */
  sense: string;
  area: Area;
  focus: string;
  mission: string[];
  questions: string[];
  programs: Program[];
  fellows: FellowSeat[];
  outputs: Output[];
  involve: Program[];
  email: string;
}

export const TBA = "Name to be announced";

const seats = (fellows: number, junior: number): FellowSeat[] => [
  { role: "Director of the Center", name: TBA },
  ...Array.from({ length: fellows }, () => ({ role: "Fellow", name: TBA })),
  ...Array.from({ length: junior }, () => ({ role: "Junior Fellow", name: TBA })),
  { role: "Visiting Scholar", name: TBA },
];

export const SEED_CENTERS: Center[] = [
  {
    slug: "akhlaq",
    name: "Center for Technology & Ethics",
    arabic: "أخلاق",
    translit: "akhlāq",
    sense: "character, ethics",
    area: "Knowledge",
    focus: "The moral questions technology raises, read through the Islamic ethical tradition.",
    mission: [
      "The Center for Technology & Ethics asks what it means to build well. It reads the questions raised by new tools (attention, surveillance, automation, persuasion) alongside the long tradition of Islamic ethical writing on character, intention and the common good.",
      "Its aim is not to issue verdicts but to cultivate judgement: to give builders, scholars and communities a shared vocabulary for weighing a technology by what it does to the people who use it, and to those who do not.",
    ],
    questions: [
      "What does the tradition's attention to intention (niyya) ask of those who design systems used by millions?",
      "How should the objectives of the law (maqāṣid) inform the way harms and benefits of a technology are weighed?",
      "Where does persuasive design end and manipulation begin?",
      "What do we owe to people who are affected by a system but never chose to use it?",
    ],
    programs: [
      { name: "Seminar series", body: "A weekly reading seminar pairing a classical ethical text with a contemporary case, open to all members of the collective." },
      { name: "Annual ethics review", body: "A yearly review of the collective's own projects, conducted in the spirit of naṣīḥa: sincere counsel offered among colleagues." },
      { name: "Case library", body: "A growing set of written cases for teaching, each drawn from a real design dilemma and stripped of identifying detail." },
    ],
    fellows: seats(2, 2),
    outputs: [
      { kind: "Working papers", title: "Ethics working papers", body: "Short essays from the seminar, published openly with ITC Research." },
      { kind: "Review", title: "The annual ethics review", body: "A public account of the year's review, its questions and its recommendations." },
      { kind: "Teaching", title: "Case library", body: "Teaching cases released for use by other institutions and study circles." },
    ],
    involve: [
      { name: "Attend the seminar", body: "Seminars are open to all members of the collective. No preparation is assumed beyond the week's reading." },
      { name: "Bring a case", body: "Builders are invited to bring a live dilemma from their own work for the seminar to consider." },
      { name: "Apply as a fellow", body: "The center hosts junior fellows and fellows each year through the Institute's fellowship programme." },
    ],
    email: "akhlaq@example.org",
  },
  {
    slug: "turath",
    name: "Center for Classical Texts",
    arabic: "تراث",
    translit: "turāth",
    sense: "heritage, inheritance",
    area: "Knowledge",
    focus: "Digitizing, editing and making searchable the manuscript heritage.",
    mission: [
      "The Center for Classical Texts serves the written inheritance of the tradition. It works with scholars and technologists to bring manuscripts and printed works into careful, open, searchable digital form.",
      "Its standard is the standard of the copyist: faithful transmission. Every edition it supports is meant to be traceable to its witnesses, correctable by its readers and usable for generations.",
    ],
    questions: [
      "How can digital editions honour the chain of transmission (isnād) that gives a text its authority?",
      "What is lost, and what is gained, when a manuscript becomes a dataset?",
      "How should machine reading of Arabic script be checked, corrected and credited?",
      "Who should hold the keys to the digital heritage of a community?",
    ],
    programs: [
      { name: "Manuscript lab", body: "A working lab for imaging, transcription and the development of open tools for reading Arabic-script manuscripts." },
      { name: "Open editions", body: "Critical digital editions released under open licences, with apparatus and witnesses recorded in full." },
      { name: "Copyists' circle", body: "A study circle on palaeography and the scribal arts, for technologists who want to understand the material they digitize." },
    ],
    fellows: seats(2, 2),
    outputs: [
      { kind: "Editions", title: "Open editions", body: "Digital editions with full apparatus, published through ITC Research." },
      { kind: "Tools", title: "Reading tools", body: "Open tools for transcription and collation, maintained with the collective's open-source house." },
      { kind: "Guides", title: "Editorial guidelines", body: "The center's editorial conventions, published so others can adopt or critique them." },
    ],
    involve: [
      { name: "Join a transcription", body: "Readers of Arabic script are welcome to join a transcription project under a scholar's guidance." },
      { name: "Contribute to the tools", body: "Engineers can contribute to the lab's open tooling alongside the collective's builders." },
      { name: "Apply as a fellow", body: "The center hosts junior fellows and fellows each year through the Institute's fellowship programme." },
    ],
    email: "turath@example.org",
  },
  {
    slug: "mal",
    name: "Center for Ethical Finance",
    arabic: "مال",
    translit: "māl",
    sense: "wealth, property",
    area: "Practice",
    focus: "Tools and standards for finance that is fair, transparent and free of exploitation.",
    mission: [
      "The Center for Ethical Finance works where the law of transactions (muʿāmalāt) meets the software that now carries most of them. It develops standards, reference tools and teaching for finance that is fair, transparent and free of exploitation.",
      "It brings jurists and engineers into the same room, so that the principles of fair exchange are expressed not only in rulings but in the systems people actually use.",
    ],
    questions: [
      "How can the prohibitions on uncertainty (gharar) and usury (ribā) be expressed in the design of financial software?",
      "What does transparency owe to a customer who cannot read the code?",
      "How should communal wealth (waqf, zakāt) be stewarded by digital systems?",
      "What would a fair default look like in a product built for people with very little?",
    ],
    programs: [
      { name: "Standards working group", body: "Jurists and engineers drafting open, reviewable standards for ethical financial products." },
      { name: "Builders' clinic", body: "Consultation sessions where teams bring a product for review against the center's principles." },
      { name: "Stewardship study", body: "A study of how endowments and charitable funds are held and distributed by digital systems." },
    ],
    fellows: seats(2, 1),
    outputs: [
      { kind: "Standards", title: "Draft standards", body: "Open drafts released for public comment before adoption." },
      { kind: "Briefs", title: "Clinic notes", body: "Anonymised notes from the builders' clinic, drawing out recurring questions." },
      { kind: "Papers", title: "Working papers", body: "Research on the law of transactions and its expression in software, published with ITC Research." },
    ],
    involve: [
      { name: "Bring a product", body: "Teams building financial tools may request a session at the builders' clinic." },
      { name: "Comment on a draft", body: "Draft standards are open for comment from any member of the collective." },
      { name: "Apply as a fellow", body: "The center hosts junior fellows and fellows each year through the Institute's fellowship programme." },
    ],
    email: "mal@example.org",
  },
  {
    slug: "talim",
    name: "Center for Learning",
    arabic: "تعليم",
    translit: "taʿlīm",
    sense: "teaching, instruction",
    area: "Practice",
    focus: "Curricula and platforms for teaching technology in community settings.",
    mission: [
      "The Center for Learning develops curricula and teaching practice for technology education in community settings: weekend schools, study circles, mosques and community centres.",
      "It holds that teaching is an act of care, and that the adab of the teacher and the student matters as much as the syllabus. Its curricula are open, adaptable and written to be taught by volunteers as well as professionals.",
    ],
    questions: [
      "What would a technology curriculum rooted in the tradition of adab look like?",
      "How can community settings teach technical skill without losing their own character?",
      "What does a learner need beyond skill: judgement, confidence, companionship?",
      "How should a curriculum be shared so that others can adapt it faithfully?",
    ],
    programs: [
      { name: "Teaching fellows", body: "Fellows who teach in community settings and bring back what they learn to improve the curriculum." },
      { name: "Open curriculum", body: "A modular, openly licensed curriculum for teaching technology from first principles." },
      { name: "Teachers' majlis", body: "A gathering for volunteer teachers to share practice, materials and counsel." },
    ],
    fellows: seats(1, 3),
    outputs: [
      { kind: "Curriculum", title: "Open curriculum", body: "Modules released openly, each with notes for the teacher." },
      { kind: "Reports", title: "Teaching reports", body: "Reflections from teaching fellows on what worked and what did not." },
      { kind: "Papers", title: "Working papers", body: "Research on learning and community education, published with ITC Research." },
    ],
    involve: [
      { name: "Teach a module", body: "Volunteers are welcome to teach a module in their own community with the center's support." },
      { name: "Host a class", body: "Community institutions may ask to host a class or a teacher-training session." },
      { name: "Apply as a fellow", body: "The center hosts junior fellows and fellows each year through the Institute's fellowship programme." },
    ],
    email: "talim@example.org",
  },
  {
    slug: "mujtama",
    name: "Center for Community Technology",
    arabic: "مجتمع",
    translit: "mujtamaʿ",
    sense: "society, community",
    area: "Society",
    focus: "Helping mosques, schools and nonprofits adopt technology well.",
    mission: [
      "The Center for Community Technology helps the institutions that hold communities together (mosques, schools, charities and families) adopt technology wisely and on their own terms.",
      "It trains stewards, gathers practical knowledge into toolkits, and asks how a community can stay in charge of the tools it depends on.",
    ],
    questions: [
      "What should a small community institution own, and what can it safely borrow?",
      "How can technology serve a congregation without turning it into an audience?",
      "What does stewardship of shared data look like in a community setting?",
      "How can the knowledge of one community's volunteers help many others?",
    ],
    programs: [
      { name: "Tech stewards", body: "A training programme for volunteers who look after the technology of a community institution." },
      { name: "Toolkit library", body: "Practical, openly licensed guides for common needs, written in plain language." },
      { name: "Field visits", body: "Listening visits to community institutions, so that the center's work begins with their questions." },
    ],
    fellows: seats(1, 2),
    outputs: [
      { kind: "Toolkits", title: "Toolkit library", body: "Plain-language guides for community institutions, freely shared." },
      { kind: "Field notes", title: "Field notes", body: "Accounts of what communities asked for and what was learned." },
      { kind: "Papers", title: "Working papers", body: "Research on community technology, published with ITC Research." },
    ],
    involve: [
      { name: "Become a steward", body: "Volunteers can join the stewards programme and serve an institution near them." },
      { name: "Invite a visit", body: "Community institutions may invite the center for a listening visit." },
      { name: "Apply as a fellow", body: "The center hosts junior fellows and fellows each year through the Institute's fellowship programme." },
    ],
    email: "mujtama@example.org",
  },
  {
    slug: "siyasa",
    name: "Center for Policy & Society",
    arabic: "سياسة",
    translit: "siyāsa",
    sense: "governance, policy",
    area: "Society",
    focus: "Research and advocacy on digital rights, privacy and inclusion.",
    mission: [
      "The Center for Policy & Society studies the public questions of a digital age: rights, privacy, inclusion and the governance of powerful systems. It draws on the tradition's long reflection on just rule (siyāsa sharʿiyya) and the public good (maṣlaḥa).",
      "Its work is careful and public. It publishes briefs, convenes discussion across perspectives, and offers counsel to the collective on how its work touches the wider society.",
    ],
    questions: [
      "What does the protection of privacy (ḥurma) require of digital systems and those who govern them?",
      "How should the public good be weighed when a technology benefits many and harms a few?",
      "How can minority communities take part in shaping the rules that govern their digital lives?",
      "What counsel does the tradition offer to those who hold power over information?",
    ],
    programs: [
      { name: "Policy briefs", body: "Short, carefully sourced briefs on questions of digital rights and governance." },
      { name: "Public convenings", body: "Open discussions that bring different perspectives into respectful conversation." },
      { name: "Counsel to the collective", body: "Advice to the collective's houses on the public implications of their work." },
    ],
    fellows: seats(2, 1),
    outputs: [
      { kind: "Briefs", title: "Policy briefs", body: "Openly published briefs, each with its sources set out in full." },
      { kind: "Records", title: "Convening records", body: "Summaries of public convenings, published with the consent of participants." },
      { kind: "Papers", title: "Working papers", body: "Longer research, published with ITC Research." },
    ],
    involve: [
      { name: "Attend a convening", body: "Public convenings are open to members of the collective and invited guests." },
      { name: "Suggest a brief", body: "Members may suggest a question for a future policy brief." },
      { name: "Apply as a fellow", body: "The center hosts junior fellows and fellows each year through the Institute's fellowship programme." },
    ],
    email: "siyasa@example.org",
  },
];

export const findCenter = (centers: Center[], slug: string): Center | undefined => centers.find((c) => c.slug === slug);
