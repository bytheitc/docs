// The Institute's three fellowship tiers. Placeholder terms: confirm before launch.
// Seed content for the "fellowships" collection; pages read the published list via lib/data.ts.

export type Season = "Autumn" | "Winter" | "Spring" | "Summer";

export interface Fellowship {
  slug: string;
  roman: string;
  title: string;
  term: string;
  body: string;
  forWhom: string;
  eligibility: string[];
  offered: string[];
  expectations: string[];
  apply: string[];
  timeline: { season: Season; title: string; body: string }[];
}

/** Seed for the "contact" settings; pages read the current address via lib/data.ts. */
export const SEED_FELLOWSHIP_EMAIL = "fellowships@example.org";

export const SEED_FELLOWSHIPS: Fellowship[] = [
  {
    slug: "junior-fellowship",
    roman: "I",
    title: "Junior Fellowship",
    term: "One year",
    body: "For students and early-career builders. Paired with a mentor and a center, with one project carried to completion.",
    forWhom: "Students and early-career builders, researchers and teachers",
    eligibility: [
      "Currently studying, or within the first few years of work in a technical, scholarly or teaching field.",
      "A sincere interest in one of the Institute's centers and the questions it holds.",
      "A proposed project small enough to complete within the year, with a clear first step.",
      "Able to take part in the year's seminars and convocation, in person or remotely.",
    ],
    offered: [
      "A mentor from within a center, met with regularly through the year.",
      "A place in the weekly seminars and the spring colloquium.",
      "Editorial support to publish the finished project with ITC Research.",
      "Companionship: a cohort of junior fellows studying alongside one another.",
      "A modest stipend, where the programme's means allow (terms to be confirmed).",
    ],
    expectations: [
      "Carry one project to completion and present it at the spring colloquium.",
      "Attend the seminar term and contribute to at least one session.",
      "Keep a short record of the year's work for the proceedings.",
      "Hold to the Institute's adab of study: generosity in critique, care with sources.",
    ],
    apply: [
      "Read the pages of the center you hope to join, and its guiding questions.",
      "Write a short statement (around one page) describing your project and why it belongs in that center.",
      "Ask one person who knows your work to send a brief note of recommendation.",
      `Send both to ${SEED_FELLOWSHIP_EMAIL} with the center's name in the subject line.`,
    ],
    timeline: [
      { season: "Spring", title: "Call opens", body: "The call for the coming year is announced at the colloquium." },
      { season: "Summer", title: "Review & conversation", body: "Each center reads applications; shortlisted applicants are invited to a conversation." },
      { season: "Autumn", title: "Convocation", body: "Junior fellows are welcomed and paired with their mentors." },
      { season: "Winter", title: "Seminar term", body: "The project takes shape alongside the weekly seminars." },
    ],
  },
  {
    slug: "fellowship",
    roman: "II",
    title: "Fellowship",
    term: "Two years",
    body: "For practitioners and scholars leading original work within a center: research, tools or teaching.",
    forWhom: "Practitioners and scholars leading original work",
    eligibility: [
      "An established practice in research, engineering, teaching or community work.",
      "A body of original work that a center's agenda would deepen, and that would deepen the center.",
      "Willingness to mentor junior fellows and to lead at least one seminar each year.",
      "Able to commit to two full years of the Institute's calendar.",
    ],
    offered: [
      "A seat within a center, with a voice in shaping its agenda.",
      "Time and company for sustained work, across two years of seminars and colloquia.",
      "Publication of research with ITC Research, and of tools with the collective's other houses.",
      "Opportunities to convene a seminar series or a working group.",
      "Support for the fellowship's work, on terms to be confirmed with each fellow.",
    ],
    expectations: [
      "Lead original work within the center and present it at each year's colloquium.",
      "Mentor at least one junior fellow.",
      "Contribute a paper or substantial piece of work to the proceedings each year.",
      "Serve the center's common life: reading, convening and counsel.",
    ],
    apply: [
      "Write to the director of the center you hope to join to begin a conversation.",
      "Prepare a proposal of two to three pages describing the work you would lead over two years.",
      "Include a short account of your previous work and two people who can speak to it.",
      `Send the proposal to ${SEED_FELLOWSHIP_EMAIL}, copied to the center.`,
    ],
    timeline: [
      { season: "Winter", title: "Conversations", body: "Prospective fellows speak with the center's director." },
      { season: "Spring", title: "Proposals", body: "Proposals are received and read by the center and the Institute." },
      { season: "Summer", title: "Appointment", body: "Fellows are appointed and the center's agenda for the year is set." },
      { season: "Autumn", title: "Convocation", body: "Fellows are welcomed and present their agendas." },
    ],
  },
  {
    slug: "visiting-scholarship",
    roman: "III",
    title: "Visiting Scholarship",
    term: "One term",
    body: "For established scholars of the Islamic sciences who want to engage with questions technology is raising.",
    forWhom: "Established scholars of the Islamic sciences",
    eligibility: [
      "Recognised learning in one or more of the Islamic sciences: law, ethics, theology, ḥadīth, language or history.",
      "A wish to engage seriously with the questions a center is holding.",
      "No technical background is required. The centers will provide the technical companionship.",
      "Able to spend one term in the life of the Institute.",
    ],
    offered: [
      "A term of residence or remote participation within a center.",
      "Technical companions from among the fellows, to explain systems in plain terms.",
      "A public lecture or seminar series, if the scholar wishes.",
      "Publication of a reflection or paper with ITC Research.",
    ],
    expectations: [
      "Lead or join a seminar during the term.",
      "Offer counsel to the center on the questions it holds.",
      "Where possible, contribute a written reflection to the proceedings.",
    ],
    apply: [
      "Visiting scholars are usually invited by a center; enquiries are also warmly welcomed.",
      "Write briefly about the questions you would like to engage and the term that suits you.",
      `Send your note to ${SEED_FELLOWSHIP_EMAIL}, and the Institute will put you in touch with the right center.`,
    ],
    timeline: [
      { season: "Autumn", title: "Invitations", body: "Centers extend invitations for the coming year." },
      { season: "Winter", title: "Seminar term", body: "Most visiting scholars join during the seminar term." },
      { season: "Spring", title: "Colloquium", body: "Visiting scholars are invited to respond to fellows' work." },
      { season: "Summer", title: "Proceedings", body: "Reflections are gathered for the year's proceedings." },
    ],
  },
];
