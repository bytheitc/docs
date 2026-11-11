import { KHATAM_POINTS } from "@/components/Khatam";

// A technical drawing of how the khatam is constructed with compass and straightedge.
// handasa (هندسة) means both "engineering" and "geometry".
export function Construction() {
  const R = 42.43; // half-diagonal of the square in the 100-unit grid
  return (
    <figure className="construction">
      <svg viewBox="-10 -10 120 120" role="img" aria-labelledby="fig1-title">
        <title id="fig1-title">Construction of the eight-pointed star from a circle and two squares</title>
        {/* construction lines */}
        <g className="c-guide">
          <line x1="-6" y1="50" x2="106" y2="50" />
          <line x1="50" y1="-6" x2="50" y2="106" />
          <line x1="12" y1="12" x2="88" y2="88" />
          <line x1="88" y1="12" x2="12" y2="88" />
          <circle cx="50" cy="50" r={R} />
          <circle cx="50" cy="50" r="30" />
        </g>
        {/* square A and square B (rotated 45°) */}
        <g className="c-square">
          <rect x="20" y="20" width="60" height="60" />
          <rect x="20" y="20" width="60" height="60" transform="rotate(45 50 50)" />
        </g>
        {/* the resulting star */}
        <polygon points={KHATAM_POINTS} className="c-star" />
        {/* dimension: r */}
        <g className="c-dim">
          {/* corner of square A sits on the circle: |(80,20) − (50,50)| = r */}
          <line x1="50" y1="50" x2="80" y2="20" />
          <text x="60" y="31">r</text>
          <path d="M 64 50 A 14 14 0 0 0 59.9 40.1" fill="none" />
          <text x="66" y="44">45°</text>
          <circle cx="50" cy="50" r="1.4" className="c-center" />
        </g>
      </svg>
      <figcaption>
        <span className="mono">FIG. 1</span> Khatam: circle <i>r</i>, square A, square B = A rotated 45°. The star is their union.
        No measurement needed, only compass and straightedge.
      </figcaption>
    </figure>
  );
}
