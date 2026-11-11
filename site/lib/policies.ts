// Draft policies (privacy, terms) shared by all six ITC sites. Pending legal review.
export interface PolicySection { heading: string; body: string[] }

export interface PolicyDoc {
  /** Fixed: "privacy" is shown at /privacy and "terms" at /terms. */
  slug: string;
  title: string;
  /** Browser tab title and search description. */
  metaTitle: string;
  description: string;
  intro: string;
  sections: PolicySection[];
}

/** Built-in content: seeds the database and serves as the fallback when none is connected. */
export const SEED_POLICIES: PolicyDoc[] = [
  {
    slug: "privacy",
    title: "Privacy",
    metaTitle: "Privacy (draft)",
    description: "Draft privacy policy for the Islamic Tech Collective and its five houses. Pending legal review.",
    intro: "How the Collective and its houses handle the information you share with us.",
    sections: [
      { heading: "Who we are", body: ["The Islamic Tech Collective and its five houses (AI, Engineering, the Institute, Open Source and Research) operate the websites that link to this page. Our legal entity and registered address will be stated here once established."] },
      { heading: "Our approach", body: ["We treat your information as an amānah, something held in trust. We collect as little as we can, use it only for the reason we collected it, and keep it no longer than we need to."] },
      { heading: "What we collect", body: ["Information you give us: your name, email address and anything you write when you join, volunteer, partner, give or contact us.", "Basic technical information: our hosting provider may keep standard server logs (such as IP address and pages requested) for security and reliability. We do not use advertising trackers."] },
      { heading: "How we use it", body: ["To reply to you, to send you what you asked for, to organise gatherings you sign up for, and to keep our sites secure. We do not sell your information or share it for others’ marketing."] },
      { heading: "Who we share it with", body: ["Only with service providers who help us run the collective (for example, hosting or email), under agreements that require them to protect it, and where the law requires us to."] },
      { heading: "How long we keep it", body: ["Enquiries are kept only as long as needed to respond and follow up. Membership records are kept while you are a member and for a short period afterwards. Exact periods will be set during legal review."] },
      { heading: "Your rights", body: ["You can ask to see, correct or delete the information we hold about you, or ask us to stop contacting you, at any time. Depending on where you live, you may have further rights under local law."] },
      { heading: "Changes", body: ["If we change this policy, we will publish the new version here with the date it takes effect, and explain significant changes in plain language."] },
    ],
  },
  {
    slug: "terms",
    title: "Terms of use",
    metaTitle: "Terms (draft)",
    description: "Draft terms of use for the Islamic Tech Collective sites. Pending legal review.",
    intro: "The ground rules for using the Collective’s sites, written to be read.",
    sections: [
      { heading: "About these terms", body: ["These terms cover your use of the websites of the Islamic Tech Collective and its five houses. By using the sites you agree to them. If you don’t agree, please don’t use the sites."] },
      { heading: "Placeholder content", body: ["Much of what appears on these sites is placeholder text describing programmes, roles and gatherings that are still being planned. Nothing here is an offer, a promise of a place or a commitment to a date."] },
      { heading: "Using the sites", body: ["Please use the sites lawfully and in good faith. Don’t try to disrupt them, access what isn’t meant for you, or use forms to send spam or abuse."] },
      { heading: "Our content and marks", body: ["The khātam marks, the house names and the site designs belong to the Collective. You may use the marks to refer to us accurately, following our brand guidelines. Code and research published under an open licence are governed by that licence instead."] },
      { heading: "What you send us", body: ["When you send us a message or a proposal, you confirm that you have the right to share it. We will handle personal information as described in our privacy policy."] },
      { heading: "Links to other sites", body: ["The houses link to one another and sometimes to outside sites. We are not responsible for the content of sites we don’t operate."] },
      { heading: "No warranty", body: ["The sites are provided as they are. We work to keep them accurate and available, but we can’t guarantee that they always will be. Limits of liability will be set during legal review."] },
      { heading: "Changes and contact", body: ["We may update these terms and will publish changes here with the date they take effect. Questions are welcome through the contact page."] },
    ],
  },
];
