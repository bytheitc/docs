import type { ReactNode } from "react";
import { KHATAM_POINTS } from "@/components/Khatam";

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * A pointed, two-centred arch (the mihrab form) on a box `w` wide and `h` tall.
 * The centres sit at 0.2w and 0.8w with radius 0.8w, so the proportions match
 * the hero frame at any size (w=300 gives centres at 60/240, r=240, springline at 222.5).
 * `inset` draws a concentric inner line, as in the hero's second gold rule.
 */
export function pointedArch(w: number, h: number, inset = 0, close = true): string {
  const r = 0.8 * w;
  const half = 0.3 * w;
  const spring = Math.sqrt(r * r - half * half);
  const ri = r - inset;
  const apex = spring - Math.sqrt(ri * ri - half * half);
  return `M${r2(inset)} ${h} V${r2(spring)} A${r2(ri)} ${r2(ri)} 0 0 1 ${r2(w / 2)} ${r2(apex)} A${r2(ri)} ${r2(ri)} 0 0 1 ${r2(w - inset)} ${r2(spring)} V${h}${close ? " Z" : ""}`;
}

/** The hero frame: pomegranate arch with a khatam lattice and a double gold rule. */
export function ArchFrame({ id = "arch" }: { id?: string }) {
  return (
    <svg viewBox="0 0 300 400" className="arch-svg" aria-hidden="true">
      <defs>
        <clipPath id={`${id}-clip`}>
          <path d={pointedArch(300, 400)} />
        </clipPath>
        <pattern id={`${id}-lattice`} width="50" height="50" patternUnits="userSpaceOnUse">
          <polygon points={KHATAM_POINTS} transform="scale(0.5)" fill="none" stroke="var(--gold)" strokeWidth="1.2" opacity="0.45" />
        </pattern>
      </defs>
      <g clipPath={`url(#${id}-clip)`}>
        <rect width="300" height="400" fill="var(--pomegranate)" />
        <rect width="300" height="400" fill={`url(#${id}-lattice)`} />
      </g>
      <path d={pointedArch(300, 400, 0, false)} fill="none" stroke="var(--gold)" strokeWidth="2" />
      <path d={pointedArch(300, 400, 14, false)} fill="none" stroke="var(--gold)" strokeWidth="0.8" />
    </svg>
  );
}

/** A framed arch with content set inside it (Arabic word-sign, numeral, etc.). */
export function Arch({ id, size = "lg", children }: { id: string; size?: "lg" | "sm"; children: ReactNode }) {
  return (
    <div className={size === "sm" ? "arch arch-sm" : "arch"}>
      <ArchFrame id={id} />
      <div className="arch-inner">{children}</div>
    </div>
  );
}

/** The head of a center card: a pointed arch that scales uniformly with the card. */
export function CardArch({ id }: { id: string }) {
  const W = 300;
  const H = 260;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="card-arch-svg" aria-hidden="true" preserveAspectRatio="xMidYMax meet">
      <defs>
        <clipPath id={`${id}-clip`}>
          <path d={pointedArch(W, H)} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-clip)`}>
        <rect width={W} height={H} fill="var(--pomegranate)" />
        <polygon points={KHATAM_POINTS} transform="translate(30 45) scale(2.4)" fill="none" stroke="var(--gold)" strokeWidth="0.6" opacity="0.45" />
      </g>
      <path d={pointedArch(W, H, 0, false)} fill="none" stroke="var(--gold)" strokeWidth="1.6" />
      <path d={pointedArch(W, H, 10, false)} fill="none" stroke="var(--gold)" strokeWidth="0.6" opacity="0.7" />
    </svg>
  );
}

/** A small arch niche outline, used for people and volume cards. */
export function NicheArch() {
  return (
    <svg viewBox="0 0 120 120" className="niche-svg" aria-hidden="true">
      <path d={pointedArch(120, 120)} fill="var(--cream-2)" stroke="var(--gold)" strokeWidth="1" />
      <polygon points={KHATAM_POINTS} transform="translate(36 52) scale(0.48)" fill="none" stroke="var(--pomegranate)" strokeWidth="2.2" opacity="0.55" />
      <polygon points={KHATAM_POINTS} transform="translate(48 64) scale(0.24)" fill="none" stroke="var(--gold)" strokeWidth="3" />
    </svg>
  );
}
