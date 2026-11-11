// The four principles of the Collective. Used on the home page (short form) and /about (in depth).
export interface Principle {
  slug: string;
  ar: string;
  name: string;
  en: string;
  root: string;
  body: string;
  long: string[];
  practice: string[];
}