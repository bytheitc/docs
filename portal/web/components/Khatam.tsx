import type { SVGProps } from "react";

// The ITC mark: an eight-pointed star (two overlapping squares) on a 100×100 grid.
// The outer star never changes. Only the center varies by house (see BRAND.md).
export const KHATAM_POINTS =
  "50,7.57 62.43,20 80,20 80,37.57 92.43,50 80,62.43 80,80 62.43,80 50,92.43 37.57,80 20,80 20,62.43 7.57,50 20,37.57 20,20 37.57,20";

export type KhatamVariant = "site" | "ai" | "engineering" | "institute" | "oss" | "research";

interface Props extends SVGProps<SVGSVGElement> {
  variant: KhatamVariant;
  strokeWidth?: number;
  accent?: string;
}

export function Khatam({ variant, strokeWidth = 5, accent = "currentColor", ...rest }: Props) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" {...rest}>
      {variant === "oss" ? (
        // Open at the top: the outline is broken so there's room to enter.
        <polyline
          points="62.43,20 80,20 80,37.57 92.43,50 80,62.43 80,80 62.43,80 50,92.43 37.57,80 20,80 20,62.43 7.57,50 20,37.57 20,20 37.57,20"
          fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="miter" strokeLinecap="square"
        />
      ) : (
        <polygon points={KHATAM_POINTS} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round" />
      )}
      {variant === "site" && <circle cx="50" cy="50" r="11" fill={accent} />}
      {variant === "ai" && (
        <g fill={accent} stroke={accent}>
          <path d="M50 36 L64 50 L50 64 L36 50 Z M50 36 L50 64 M36 50 L64 50" fill="none" strokeWidth="2" />
          <circle cx="50" cy="36" r="5" /><circle cx="64" cy="50" r="5" /><circle cx="50" cy="64" r="5" /><circle cx="36" cy="50" r="5" />
        </g>
      )}
      {variant === "engineering" && (
        <g stroke={accent} strokeWidth="3" fill="none">
          <circle cx="50" cy="50" r="10" />
          <path d="M50 30 V43 M50 57 V70 M30 50 H43 M57 50 H70" />
        </g>
      )}
      {variant === "institute" && (
        <polygon points={KHATAM_POINTS} transform="translate(30 30) scale(0.4)" fill={accent} />
      )}
      {variant === "oss" && <rect x="42" y="42" width="16" height="16" fill={accent} />}
      {variant === "research" && (
        <g fill="none" stroke={accent} strokeWidth="2.5">
          <circle cx="50" cy="50" r="5" fill={accent} />
          <circle cx="50" cy="50" r="12" />
          <circle cx="50" cy="50" r="19" opacity="0.5" />
        </g>
      )}
    </svg>
  );
}
