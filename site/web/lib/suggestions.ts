// The suggestions page: what the Collective should build for the Muslim community, asked of the
// people who would use it. This is the page's own copy; the suggestions themselves arrive as form
// submissions and are read in the Studio's inbox.

export interface SuggestPrompt {
  title: string;
  body: string;
}

export interface SuggestStep {
  title: string;
  body: string;
}

export interface SuggestPage {
  id: string;
  headline: string;
  intro: string;
  /** Questions that help someone describe a need rather than a feature. */
  prompts: SuggestPrompt[];
  /** What happens to a suggestion after it is sent. */
  steps: SuggestStep[];
  /** The kinds of need the form offers. */
  areas: string[];
  /** What the Collective will not take on, said plainly. */
  outOfScope: string[];
  /** Shown under the form. */
  privacy: string;
}
