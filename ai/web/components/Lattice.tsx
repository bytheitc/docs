"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

// Generative khatam lattice. Every node is a vertex of a tiled 8-point star (construction-true),
// and edges light up near the pointer.
const STAR: ReadonlyArray<readonly [number, number]> = [
  [0.5, 0.0757], [0.6243, 0.2], [0.8, 0.2], [0.8, 0.3757], [0.9243, 0.5], [0.8, 0.6243], [0.8, 0.8], [0.6243, 0.8],
  [0.5, 0.9243], [0.3757, 0.8], [0.2, 0.8], [0.2, 0.6243], [0.0757, 0.5], [0.2, 0.3757], [0.2, 0.2], [0.3757, 0.2],
];

interface Node { x: number; y: number; ox: number; oy: number; ph: number }

export function Lattice() {
  const ref = useRef<HTMLCanvasElement>(null);
  // Full strength on the home page; a quieter backdrop behind long-form subpages.
  const subtle = usePathname() !== "/";

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 0, H = 0, DPR = 1, raf = 0;
    let nodes: Node[] = [];
    let edges: [number, number][] = [];
    const mouse = { x: -9999, y: -9999 };

    const build = () => {
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.width = window.innerWidth * DPR;
      H = canvas.height = window.innerHeight * DPR;
      nodes = []; edges = [];
      const cell = Math.max(140, Math.min(220, window.innerWidth / 6)) * DPR;
      const cols = Math.ceil(W / cell) + 1;
      const rows = Math.ceil(H / cell) + 1;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const base = nodes.length;
          for (const [u, v] of STAR) {
            const x = (c + u) * cell - cell * 0.25;
            const y = (r + v) * cell - cell * 0.25;
            nodes.push({ x, y, ox: x, oy: y, ph: Math.random() * Math.PI * 2 });
          }
          for (let i = 0; i < 16; i++) edges.push([base + i, base + ((i + 1) % 16)]);
          for (let i = 0; i < 16; i += 2) edges.push([base + i, base + ((i + 6) % 16)]);
        }
      }
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, W, H);
      const mx = mouse.x * DPR, my = mouse.y * DPR, R = 260 * DPR;
      for (const n of nodes) {
        n.x = n.ox + Math.sin(t * 0.0004 + n.ph) * 3 * DPR;
        n.y = n.oy + Math.cos(t * 0.0005 + n.ph) * 3 * DPR;
      }
      ctx.lineWidth = DPR;
      for (const [a, b] of edges) {
        const A = nodes[a], B = nodes[b];
        const glow = Math.max(0, 1 - Math.hypot((A.x + B.x) / 2 - mx, (A.y + B.y) / 2 - my) / R);
        ctx.strokeStyle = glow > 0 ? `rgba(46,196,182,${0.06 + glow * 0.55})` : "rgba(124,147,255,0.06)";
        ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
      }
      for (const n of nodes) {
        const glow = Math.max(0, 1 - Math.hypot(n.x - mx, n.y - my) / R);
        if (glow <= 0) continue;
        ctx.fillStyle = `rgba(224,178,82,${glow * 0.9})`;
        ctx.beginPath(); ctx.arc(n.x, n.y, (1 + glow * 2) * DPR, 0, Math.PI * 2); ctx.fill();
      }
      if (!reduce) raf = requestAnimationFrame(draw);
    };

    const onMove = (e: PointerEvent) => { mouse.x = e.clientX; mouse.y = e.clientY; if (reduce) draw(0); };
    const onLeave = () => { mouse.x = mouse.y = -9999; };
    const onResize = () => { build(); if (reduce) draw(0); };
    // Stop drawing while the tab is hidden.
    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) raf = requestAnimationFrame(draw);
    };

    build();
    raf = requestAnimationFrame(draw);
    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onMove);
    document.addEventListener("pointerleave", onLeave);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return <canvas ref={ref} className={subtle ? "lattice subtle" : "lattice"} aria-hidden="true" />;
}
