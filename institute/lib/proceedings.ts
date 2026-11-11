// Proceedings archive. Placeholder volumes: titles and contents are illustrative only.
// Seed content for the "proceedings" collection (id = year); pages read the published list via lib/data.ts.
import { SEED_CENTERS, type Center } from "@/lib/centers";

export interface Paper {
  title: string;
  author: string;
  /** Optional link to a center. */
  center?: Center["slug"];
}

export const VOLUME_STATUSES = ["In preparation", "Forthcoming", "Published"] as const;
export type VolumeStatus = (typeof VOLUME_STATUSES)[number];

export interface Volume {
  year: string;
  roman: string;
  title: string;
  status: VolumeStatus;
  note: string[];
  papers: Paper[];
}

const center = (slug: string) => SEED_CENTERS.find((c) => c.slug === slug)!;
const byFellow = (slug: string, role = "A fellow") => `${role} of the ${center(slug).name}`;

export const SEED_VOLUMES: Volume[] = [
  {
    year: "2027",
    roman: "II",
    title: "On Stewardship",
    status: "In preparation",
    note: [
      "The second volume will gather the work of the current year. Its contents are being settled as the seminar term proceeds, and will be listed here after the spring colloquium.",
    ],
    papers: [],
  },
  {
    year: "2026",
    roman: "I",
    title: "On Beginnings",
    status: "Forthcoming",
    note: [
      "The first volume of the proceedings records the Institute's opening year: the agendas set at its first convocation, the questions taken up in seminar, and the work presented at its first colloquium.",
      "Every paper listed here is a placeholder, standing in for the work it will become. Final texts will be published openly with ITC Research.",
    ],
    papers: [
      { title: "Intention and the interface: notes from the first seminar", author: byFellow("akhlaq"), center: "akhlaq" },
      { title: "Toward a digital apparatus: editorial conventions for open editions", author: byFellow("turath"), center: "turath" },
      { title: "Fair defaults: a first draft for comment", author: "The Standards Working Group", center: "mal" },
      { title: "Teaching from first principles: a report from the weekend schools", author: byFellow("talim", "A teaching fellow"), center: "talim" },
      { title: "What communities asked for: field notes from the first visits", author: byFellow("mujtama", "A junior fellow"), center: "mujtama" },
      { title: "Privacy and the inviolable: a policy brief", author: byFellow("siyasa"), center: "siyasa" },
    ],
  },
];
