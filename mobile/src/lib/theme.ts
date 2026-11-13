// The Collective's palette, as the portal uses it. The app is the portal's companion, so it
// borrows the portal's voice rather than inventing one: parchment and iron-gall ink, emerald
// for anything actionable, gold only ever as an accent (BRAND.md, rule 3).
//
// Dark is not a tint of light. Emerald at #0F5C4D fails contrast on a dark ground, so the dark
// palette lifts it; the washes are rebuilt rather than inverted.
import { useColorScheme } from "react-native";

export interface Palette {
  /** Page ground. */
  bg: string;
  /** Raised surface: cards, rows, sheets. */
  card: string;
  /** A second surface for things sitting on a card. */
  sunken: string;
  ink: string;
  inkSoft: string;
  inkFaint: string;
  line: string;
  lineStrong: string;
  /** Emerald. Everything you can act on. */
  accent: string;
  accentInk: string;
  accentWash: string;
  gold: string;
  warn: string;
  warnWash: string;
  danger: string;
  dangerWash: string;
  ok: string;
  okWash: string;
}

const light: Palette = {
  bg: "#FCFAF5",
  card: "#FFFFFF",
  sunken: "#F3EDE0",
  ink: "#14201B",
  inkSoft: "#46524C",
  inkFaint: "#7C877F",
  line: "rgba(20, 32, 27, 0.14)",
  lineStrong: "rgba(20, 32, 27, 0.30)",
  accent: "#0F5C4D",
  accentInk: "#FFFFFF",
  accentWash: "#E4EFE9",
  gold: "#B8862F",
  warn: "#8A5A12",
  warnWash: "#F8EEDC",
  danger: "#A3261B",
  dangerWash: "#FBEEEA",
  ok: "#0F5C4D",
  okWash: "#E4EFE9",
};

const dark: Palette = {
  bg: "#0E1512",
  card: "#161F1B",
  sunken: "#1E2A25",
  ink: "#ECF1EE",
  inkSoft: "#9BA9A3",
  inkFaint: "#6E7C76",
  line: "rgba(236, 241, 238, 0.12)",
  lineStrong: "rgba(236, 241, 238, 0.26)",
  accent: "#5BB89B",
  accentInk: "#07110D",
  accentWash: "#15302A",
  gold: "#D9B56B",
  warn: "#D9A441",
  warnWash: "#2E2416",
  danger: "#E58A7C",
  dangerWash: "#301916",
  ok: "#5BB89B",
  okWash: "#15302A",
};

/** One step per line, so spacing never becomes a free-for-all. */
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

/** Type scale. `tabular` is for anything a reader compares down a column. */
export const type = {
  display: { fontSize: 30, lineHeight: 36, fontWeight: "700" },
  title: { fontSize: 22, lineHeight: 28, fontWeight: "700" },
  heading: { fontSize: 17, lineHeight: 22, fontWeight: "600" },
  body: { fontSize: 16, lineHeight: 23, fontWeight: "400" },
  callout: { fontSize: 15, lineHeight: 21, fontWeight: "400" },
  label: { fontSize: 13, lineHeight: 17, fontWeight: "600" },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: "400" },
  /** Small, wide and upper — section markers only. */
  eyebrow: { fontSize: 11, lineHeight: 14, fontWeight: "700", letterSpacing: 0.8 },
} as const;

/** The smallest a touch target may be. Anything you can tap is at least this tall and wide. */
export const HIT = 44;

export function useTheme(): Palette {
  return useColorScheme() === "dark" ? dark : light;
}

export function useIsDark(): boolean {
  return useColorScheme() === "dark";
}

export const palettes = { light, dark };
