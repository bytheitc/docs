// Seed content for the home page's "Where we focus" cards and "From the lab" list.
// Editors manage the live version in the admin (singleton "home").

export interface FocusCard {
  tag: string;
  title: string;
  body: string;
  output: string;
  /** e.g. "AI × Research". */
  with: string;
  href: string;
}

export interface LabItem {
  type: string;
  title: string;
  href: string;
}

export interface HomeContent {
  id: "home";
  focus: FocusCard[];
  lab: LabItem[];
}
