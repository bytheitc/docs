// Placeholder open-science policies. Have them reviewed before launch.
export interface Policy {
  slug: string;
  title: string;
  lede: string;
  clauses: string[];
}

/** Built-in content: seeds the database and serves as the fallback when none is connected. */
export const SEED_POLICIES: Policy[] = [
  {
    slug: "open-access",
    title: "Open access",
    lede: "Every publication is free to read. No paywalls, ever.",
    clauses: [
      "Every paper, report, working note and datasheet issued by ITC Research is published on this site in full, free of charge, without registration.",
      "Where work also appears in an external venue, we choose venues that permit the full text to be posted here at the time of publication. Where a venue does not permit this, we do not submit there.",
      "Publications are released under an open licence that permits reuse with attribution. The specific licence is pending review and will be stated on each publication page.",
      "Each publication keeps a permanent identifier of the form itc-r-NNN. Identifiers are never reused, including for withdrawn work.",
    ],
  },
  {
    slug: "open-data",
    title: "Open data, where consent allows",
    lede: "Datasets are released with datasheets and clear licences, where consent allows.",
    clauses: [
      "Every dataset we create or substantially modify is described by a datasheet covering motivation, composition, collection process, consent, preprocessing, intended uses, distribution and maintenance. Unknown values are marked “pending”, not omitted.",
      "Consent comes before openness. Data about people is released only to the extent that the people concerned agreed to its release, in terms they could understand. Where they did not agree, we do not release it, whatever the scientific benefit.",
      "Where data cannot be public, we release what can be: instruments, codebooks, aggregate descriptions, or access under an agreement administered by the data steward.",
      "Participants may withdraw. Withdrawn data is removed from every subsequent release, and the removal is recorded in the dataset’s changelog without identifying the person.",
      "Small communities are easy to re-identify. We treat redaction as insufficient on its own and assess re-identification risk before any release involving community members.",
    ],
  },
  {
    slug: "open-code",
    title: "Open code",
    lede: "Analysis code is published alongside results through ITC Open Source.",
    clauses: [
      "The code needed to reproduce a published result is released through ITC Open Source at the time of publication, under an open-source licence.",
      "Releases are tagged to the version used for the publication, so that later changes do not silently alter what a reader reproduces.",
      "Where code depends on data that cannot be public, we say so on the publication page and provide synthetic or sample inputs that exercise the same code paths.",
      "We do not claim code is reproducible unless someone other than its author has run it from the published instructions.",
    ],
  },
  {
    slug: "preregistration",
    title: "Preregistration",
    lede: "Studies that test a hypothesis are registered before data is examined.",
    clauses: [
      "Confirmatory studies, including evaluations that will be used to compare systems, are preregistered: the question, the measures, the analysis plan and the stopping rule are written down and time-stamped before data is examined.",
      "Preregistrations are published as working notes, either at registration or, where publishing early would compromise a study, at the time results are reported.",
      "Deviations from a preregistered plan are allowed and are reported in the publication, with the reason for each.",
      "Exploratory work is welcome and is labelled as exploratory.",
    ],
  },
  {
    slug: "negative-results",
    title: "Negative and null results",
    lede: "What didn’t work gets written up too.",
    clauses: [
      "Work that did not reach its aim is written up at the same standard as work that did, at minimum as a working note.",
      "A negative result reports what was attempted, what was expected, what was found and what we think it means, without apology and without spin.",
      "Preregistered studies are always reported, whatever their outcome.",
    ],
  },
  {
    slug: "corrections",
    title: "Corrections and retractions",
    lede: "Errors are corrected in the open, and the record of the correction is kept.",
    clauses: [
      "Anyone may report an error by writing to corrections@example.org. Reports are acknowledged and reviewed by the managing editor with the responsible group.",
      "Minor errors that do not affect conclusions are corrected in place, with a dated erratum note at the end of the publication.",
      "Errors that affect conclusions are corrected with a new version. The previous version remains available, and the publication page states what changed and why.",
      "Work found to be unsound is retracted. A retracted publication remains at its address, clearly marked, with a statement of the reason. Its identifier is not reused.",
      "We credit the person who reported an error, if they wish to be credited.",
    ],
  },
];
