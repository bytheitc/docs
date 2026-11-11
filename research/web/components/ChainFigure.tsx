/** FIG. 1: an isnad-style provenance chain. A diagram of the idea, not a chart of data.
 *  Two drawings of the same chain: horizontal for wide screens, vertical (larger type) for phones. */
const NODES = [
  { label: "Answer", sub: "generated" },
  { label: "Passage", sub: "retrieved" },
  { label: "Edition", sub: "vol. · page" },
  { label: "Manuscript", sub: "source" },
];
const TITLE = "A provenance chain linking a generated answer to a retrieved passage, to a printed edition, to the original manuscript";

function Horizontal() {
  const xs = [40, 180, 320, 460];
  return (
    <svg viewBox="0 0 520 150" role="img" aria-labelledby="fig1-h" className="fig-h">
      <title id="fig1-h">{TITLE}</title>
      <defs>
        <marker id="arrow-h" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" className="fig-arrowhead" />
        </marker>
      </defs>
      {xs.slice(0, -1).map((x, i) => (
        <g key={i}>
          <line x1={x + 42} y1="62" x2={xs[i + 1] - 42} y2="62" className="fig-edge" markerEnd="url(#arrow-h)" />
          <text x={(x + xs[i + 1]) / 2} y="52" className="fig-edge-label">cites</text>
        </g>
      ))}
      {NODES.map((n, i) => (
        <g key={n.label}>
          <rect x={xs[i] - 40} y="40" width="80" height="44" className={i === 0 ? "fig-node first" : "fig-node"} />
          <text x={xs[i]} y="60" className="fig-label">{n.label}</text>
          <text x={xs[i]} y="75" className="fig-sub">{n.sub}</text>
        </g>
      ))}
      <path d="M 460 92 C 460 130, 40 130, 40 92" className="fig-verify" markerEnd="url(#arrow-h)" />
      <text x="250" y="138" className="fig-edge-label">verifiable end-to-end</text>
    </svg>
  );
}

function Vertical() {
  const ys = [20, 110, 200, 290];
  const w = 160, h = 52, cx = 110;
  return (
    <svg viewBox="0 0 300 360" role="img" aria-labelledby="fig1-v" className="fig-v">
      <title id="fig1-v">{TITLE}</title>
      <defs>
        <marker id="arrow-v" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" className="fig-arrowhead" />
        </marker>
      </defs>
      {ys.slice(0, -1).map((y, i) => (
        <g key={i}>
          <line x1={cx} y1={y + h + 2} x2={cx} y2={ys[i + 1] - 4} className="fig-edge" markerEnd="url(#arrow-v)" />
          <text x={cx + 10} y={(y + h + ys[i + 1]) / 2 + 5} className="fig-edge-label v">cites</text>
        </g>
      ))}
      {NODES.map((n, i) => (
        <g key={n.label}>
          <rect x={cx - w / 2} y={ys[i]} width={w} height={h} className={i === 0 ? "fig-node first" : "fig-node"} />
          <text x={cx} y={ys[i] + 24} className="fig-label v">{n.label}</text>
          <text x={cx} y={ys[i] + 42} className="fig-sub v">{n.sub}</text>
        </g>
      ))}
      <path d={`M ${cx + w / 2 + 4} ${ys[3] + h / 2} C 280 ${ys[3] + h / 2}, 280 ${ys[0] + h / 2}, ${cx + w / 2 + 6} ${ys[0] + h / 2}`} className="fig-verify" markerEnd="url(#arrow-v)" />
      <text x="288" y="180" className="fig-edge-label vmid" transform="rotate(90 288 180)">verifiable end-to-end</text>
    </svg>
  );
}

export function ChainFigure({ n = 1 }: { n?: number }) {
  return (
    <figure className="fig">
      <Horizontal />
      <Vertical />
      <figcaption><b>Fig. {n}.</b> Each claim in a generated answer links back through every intermediate source to its origin, as an <i>isnād</i> does for a report.</figcaption>
    </figure>
  );
}
