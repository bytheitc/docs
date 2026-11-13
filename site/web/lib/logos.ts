// Brand constant: the logo system. Mirrors the HOUSES table in brand/generate.py, which
// writes the SVGs these entries point at. Change a colour or a name there, run
// `python3 brand/generate.py`, then update this file to match.
//
// `theme` is the background a house's own pages use, so the brand page knows which
// colourway to show against which backdrop.

export interface Lockup {
  /** Matches the folder name, and the file names under /brand/. */
  id: string;
  /** The word set beside the mark. */
  word: string;
  /** The property this belongs to, as people say it. */
  label: string;
  theme: "light" | "dark";
  /** The disc. */
  primary: string;
  /** The nun knocked out of the disc; also the house's page background. */
  surface: string;
  /** The wordmark, on the house's own background. */
  ink: string;
}

export const LOCKUPS: Lockup[] = [
  { id: "site", word: "Islamic Tech Collective", label: "The Collective", theme: "light", primary: "#0F5C4D", surface: "#F3EDE0", ink: "#14201B" },
  { id: "ai", word: "AI", label: "AI", theme: "dark", primary: "#4C6FFF", surface: "#070A14", ink: "#E8ECFF" },
  { id: "engineering", word: "Engineering", label: "Engineering", theme: "light", primary: "#E35D0F", surface: "#F5F5F0", ink: "#111111" },
  { id: "health", word: "Health", label: "Health", theme: "light", primary: "#2F6F5E", surface: "#FBFBF8", ink: "#15201C" },
  { id: "institute", word: "Institute", label: "Institute", theme: "light", primary: "#7A1F2B", surface: "#FAF6EF", ink: "#2A1A1C" },
  { id: "oss", word: "Open Source", label: "Open Source", theme: "dark", primary: "#C6F432", surface: "#0B0B0B", ink: "#FFFFFF" },
  { id: "research", word: "Research", label: "Research", theme: "light", primary: "#1F2A5A", surface: "#FFFFFE", ink: "#1F2A5A" },
  { id: "portal", word: "Contributor Portal", label: "Contributor portal", theme: "light", primary: "#0F5C4D", surface: "#FCFAF5", ink: "#14201B" },
  { id: "cms", word: "Studio", label: "Studio", theme: "light", primary: "#0F5C4D", surface: "#F3EDE0", ink: "#14201B" },
  { id: "status", word: "Status", label: "Status", theme: "light", primary: "#272D38", surface: "#FBFBFA", ink: "#272D38" },
];

/** The backdrop the inverse colourway is meant for. */
export const inverseBackdrop = (l: Lockup) => (l.theme === "light" ? "#14201B" : "#FFFFFF");

// Measured from the original artwork, in a system where the disc spans 0-100.
export const GEOMETRY: { label: string; value: string }[] = [
  { label: "Nūn height", value: "63.4% of the disc" },
  { label: "Nūn width", value: "53.5% of the disc" },
  { label: "Nūn position", value: "centred, 1.07% above the disc's centre" },
  { label: "Wordmark cap height", value: "42.1" },
  { label: "Wordmark baseline", value: "y = 68.85" },
  { label: "Disc edge → first letter", value: "20.4" },
  { label: "Clear space", value: "half the disc's diameter, on every side" },
  { label: "Minimum size", value: "a 20px disc" },
];

export const RULES: string[] = [
  "Never redraw the nūn. Scale the file; don't trace it again.",
  "The disc is always a full circle. Never crop it, and never set the nūn on its own.",
  "Each house uses its own colourway. Never put one house's colours on another's lockup.",
  "Two colours in the mark, one in the wordmark. No gradients, no shadows, no outlines.",
  "Over a photograph, use the inverse lockup on a solid panel rather than the bare mark.",
];
