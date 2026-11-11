// Page-level content for the Join, Support, Contact and Press pages.
import type { HouseId } from "@/lib/houses";

/* ---------------- Join ---------------- */

export interface Way { title: string; body: string; gives: string; link?: { label: string; href: string } }
export interface JoinPage { id: string; ways: Way[] }
/* ---------------- Support / giving ---------------- */

export interface TitledText { title: string; body: string }
export interface GivingPage {
  id: string;
  uses: TitledText[];
  options: TitledText[];
  email: string;
  /** Shown under the giving button. */
  note: string;
  /** "A note on zakat and tax status". */
  notice: string[];
}
/* ---------------- Contact ---------------- */

export interface ContactPage {
  id: string;
  channels: { label: string; email: string }[];
  /** Options in the contact form's "Who is this for?" menu. */
  topics: string[];
}
/* ---------------- Press ---------------- */

export interface PressPage {
  id: string;
  email: string;
  centers: { house: HouseId; text: string }[];
  donts: string[];
  guidelines: string;
}