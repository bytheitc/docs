import type { PrincipleId } from "@/lib/charter";

// Seed content: editors manage the live version in the admin (collection "guides").
// Adoption guides. Placeholder long-form content: review with partner organisations before launch.
// These guides are not legal advice and do not offer religious rulings.

export interface GuideSection {
  id: string;
  heading: string;
  paragraphs: string[];
  list?: string[];
}

export interface Guide {
  slug: string;
  audience: string;
  title: string;
  dek: string;
  principles: PrincipleId[];
  sections: GuideSection[];
  checklist: string[];
}

export const SEED_GUIDES: Guide[] = [
  {
    slug: "mosques",
    audience: "mosques & masjid committees",
    title: "AI in the masjid: a guide for committees",
    dek: "How to decide whether an AI tool belongs in your mosque's work, and how to keep the community's trust if it does.",
    principles: ["amanah", "sidq", "shura"],
    sections: [
      {
        id: "start",
        heading: "Start with the need, not the tool",
        paragraphs: [
          "Most committees first meet AI through a product: a chatbot for the website, an app that writes the Friday newsletter, a system that answers questions about prayer times and events. Before evaluating any of them, write down in one sentence what problem you are trying to solve and who currently solves it.",
          "Often the honest answer is that a volunteer is overstretched. That is a real problem, and sometimes a tool helps. But sometimes the better answer is a second volunteer, a shared calendar or a simpler website. AI is one option among several, not the default.",
        ],
      },
      {
        id: "lines",
        heading: "Draw the lines before you buy",
        paragraphs: [
          "Decide, as a committee and with your imam, which questions a tool must never answer on the mosque's behalf. For most communities this includes any question of personal religious guidance. A chatbot on a mosque website carries the mosque's name; people will reasonably assume it speaks for the mosque.",
          "Write these lines down and give them to any vendor. A good vendor will show you how their tool respects them. A vendor who says their tool can answer anything should be treated with caution.",
        ],
        list: [
          "No rulings or fatwas, ever. Questions of fiqh go to the imam or a scholar the person trusts.",
          "No counselling. Questions about grief, marriage or mental health go to a person.",
          "No collecting sensitive details (immigration status, health, finances) through an automated tool.",
        ],
      },
      {
        id: "data",
        heading: "Treat congregation data as an amānah",
        paragraphs: [
          "Mailing lists, donation records and questions people type into a website form are held in trust. Before connecting any of them to an AI service, find out where the data goes, who can read it, how long it is kept and whether it is used to train the vendor's models.",
          "If the vendor cannot answer these questions clearly and in writing, do not connect the data. Choose tools that run locally, or that let you switch off retention and training, wherever possible.",
        ],
      },
      {
        id: "consult",
        heading: "Consult the people affected",
        paragraphs: [
          "The committee is not the only group affected. Elders who are less comfortable with technology, young people who will be the first to test it, sisters' and youth committees, and the volunteers whose work may change should all hear about the proposal before it is decided.",
          "A short open meeting after a prayer, with a plain explanation and time for questions, is often enough. Record the concerns raised and how you responded to them.",
        ],
      },
      {
        id: "pilot",
        heading: "Run a small, reversible pilot",
        paragraphs: [
          "Start with one narrow use (for example, drafting event announcements that a person then edits) for a fixed period, with a named person responsible. Agree in advance what would make you stop.",
          "At the end, ask the volunteers and the community what changed. If the tool saved time but cost trust, that is not a success.",
        ],
      },
      {
        id: "disclose",
        heading: "Be open about what you use",
        paragraphs: [
          "If a tool helped write something, or answers questions on your website, say so plainly. A one-line note is enough. Openness costs little and protects the mosque's credibility if the tool makes a mistake.",
        ],
      },
    ],
    checklist: [
      "We have written down the problem in one sentence.",
      "Our imam and committee agreed which questions no tool may answer.",
      "The vendor has told us in writing where our data goes and whether it trains their models.",
      "We held an open meeting and recorded concerns.",
      "Our pilot has an end date, an owner and a stop condition.",
      "We tell people when AI is used.",
    ],
  },
  {
    slug: "schools",
    audience: "Islamic schools & weekend madrasas",
    title: "AI in the classroom: a guide for Islamic schools",
    dek: "For heads, teachers and governors deciding how AI tools fit into learning, assessment and the school's care for its students.",
    principles: ["amanah", "sidq", "adl"],
    sections: [
      {
        id: "purpose",
        heading: "Begin with what learning is for",
        paragraphs: [
          "Islamic schools hold that learning shapes character as well as skill. Any decision about AI should start there. A tool that helps a student practise vocabulary may serve that purpose; a tool that writes their essay for them works against it.",
          "Discuss, as a staff, which kinds of work you want students to struggle with themselves, because the struggle is the learning. Those are the places to keep AI out, or to use it only after the student's own attempt.",
        ],
      },
      {
        id: "religious",
        heading: "Religious instruction stays with teachers",
        paragraphs: [
          "General-purpose AI tools can produce confident, fluent and wrong statements about the Qur'an, hadith and fiqh, including invented references. Students may not be able to tell the difference.",
          "We recommend that AI tools are not used as a source of religious knowledge in class. If they are used at all in Islamic studies, it should be under a teacher's direction, for tasks like finding where a passage appears, with every result checked against the text.",
        ],
        list: [
          "Teach students that a citation from an AI tool must be checked before it is trusted.",
          "Never present AI output as the words of a scholar or teacher.",
          "Direct students' personal religious questions to teachers and scholars, not tools.",
        ],
      },
      {
        id: "children",
        heading: "Children's data needs extra care",
        paragraphs: [
          "Many AI services are not designed for children and have terms that exclude them. Before any tool is used with students, check its age requirements and data practices, and check them against the data-protection rules that apply to your school.",
          "Prefer tools that do not require student accounts, do not retain what students type, and do not use it for training. Parents should be told which tools are used and why.",
        ],
      },
      {
        id: "fairness",
        heading: "Watch for uneven quality",
        paragraphs: [
          "AI tools often work better in some languages and dialects than others. In a school where families speak many languages at home, a tool that serves some students well and others poorly is not neutral. Ask teachers to note where a tool falls short for particular students, and take that into account before expanding its use.",
        ],
      },
      {
        id: "assessment",
        heading: "Be clear about assessment",
        paragraphs: [
          "Students deserve clear rules. For each kind of assessed work, say whether AI tools are allowed, allowed with disclosure, or not allowed, and explain why. Avoid relying on AI-detection tools to enforce these rules; they can be unreliable and can wrongly accuse students.",
        ],
      },
      {
        id: "staff",
        heading: "Support staff, don't replace judgement",
        paragraphs: [
          "Teachers may find AI useful for drafting lesson resources or differentiating materials. Encourage them to treat every output as a first draft they are responsible for, and give them time to learn the tools rather than expecting it on top of a full workload.",
        ],
      },
    ],
    checklist: [
      "Staff have agreed where students must do the work themselves.",
      "AI is not used as a source of religious knowledge in class.",
      "Every tool used with students has been checked for age limits and data practices.",
      "Parents have been told which tools are used and why.",
      "Assessment rules on AI are written down and shared with students.",
      "Teachers report where tools work poorly for particular students.",
    ],
  },
  {
    slug: "nonprofits",
    audience: "community nonprofits & charities",
    title: "AI for community nonprofits: a practical guide",
    dek: "For staff and trustees of Muslim-led and faith-based nonprofits weighing AI for operations, outreach and services.",
    principles: ["amanah", "shura", "adl", "ilm"],
    sections: [
      {
        id: "where",
        heading: "Where AI tends to help, and where it doesn't",
        paragraphs: [
          "AI tools are often useful for internal, low-stakes work: drafting first versions of documents, summarising long reports, translating internal notes for review. They are riskier anywhere they speak directly to the people you serve, make decisions about them, or handle their personal information.",
          "A useful rule: the closer a task is to a vulnerable person, the more a human should be in the loop, and the stronger the case must be for using a tool at all.",
        ],
      },
      {
        id: "beneficiaries",
        heading: "Beneficiary data is held in trust",
        paragraphs: [
          "People who come to a nonprofit for help often share information they would not share anywhere else. Pasting case notes, names or circumstances into a general AI service may send that information to a third party and may breach the promises you made when you collected it.",
          "Set a simple, written rule: no beneficiary information goes into an AI tool unless that tool has been approved for it, and approval requires clear answers on storage, access, retention and training.",
        ],
      },
      {
        id: "donors",
        heading: "Honesty with donors and funders",
        paragraphs: [
          "If AI helps write appeals, reports or applications, the content is still your organisation's claim. Every figure, story and outcome must be one you can stand behind. Never let a tool invent impact, quotations or beneficiary stories, and never present a composite or generated story as a real person's.",
        ],
      },
      {
        id: "decide",
        heading: "Decide with the people you serve",
        paragraphs: [
          "If a tool will change how people reach you or how you respond to them, ask some of them first. A small group of service users, volunteers and frontline staff will see problems that leadership will miss, especially around language, accessibility and dignity.",
        ],
        list: [
          "Will this make it harder for anyone to reach a person?",
          "Does it work in the languages our community uses?",
          "Would we be comfortable explaining it to the people it affects?",
        ],
      },
      {
        id: "policy",
        heading: "Write a short policy, then revisit it",
        paragraphs: [
          "A one-page AI use policy is enough for most organisations: which tools are approved, what data may go into them, who approves new uses, and how you tell people AI was involved. Review it at least once a year, and after any mistake.",
        ],
      },
      {
        id: "share",
        heading: "Share what you learn",
        paragraphs: [
          "Other organisations are facing the same questions. When a pilot works, or doesn't, write a short note about what you tried and what happened, and share it with your peers. Mistakes shared early save the whole sector from repeating them.",
        ],
      },
    ],
    checklist: [
      "We know which tasks are internal and low-stakes, and which touch beneficiaries.",
      "No beneficiary data goes into an unapproved tool.",
      "Every claim in AI-assisted content has been checked by a person.",
      "Service users and frontline staff were consulted before changes to services.",
      "We have a one-page AI use policy with a review date.",
      "We share what we learn with peer organisations.",
    ],
  },
];

/** Rough reading time, computed from the guide's own text. */
export function readingMinutes(g: Guide): number {
  const words = [g.dek, ...g.sections.flatMap((s) => [s.heading, ...s.paragraphs, ...(s.list ?? [])]), ...g.checklist]
    .join(" ")
    .split(/\s+/).length;
  return Math.max(1, Math.round(words / 220));
}
