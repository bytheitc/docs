// Private milestones: evaluated per contributor from their own work only. No points, no comparison.
import type { MilestoneDef } from "@/lib/portal/seed";
import type { Contribution } from "@/lib/portal/types";

/** Contributions that count: not hidden, and self-logged ones only once verified. */
export const counts = (c: Contribution) => !c.hidden && (c.provider !== "self" || c.review?.status === "verified");

export interface Reached { def: MilestoneDef; at: Date | null }

/** Which milestones a contributor has reached, with the date of the contribution that reached it. */
export function evaluateMilestones(defs: MilestoneDef[], all: Contribution[]): { reached: Reached[]; next: MilestoneDef[] } {
  const list = all.filter(counts).sort((a, b) => +new Date(a.occurredAt) - +new Date(b.occurredAt));
  const reached: Reached[] = [];
  const next: MilestoneDef[] = [];
  for (const def of defs) {
    const t = Math.max(1, Number(def.threshold) || 1);
    let at: Date | null = null;
    const seen = new Set<string>();
    let n = 0;
    for (const c of list) {
      let hit = false;
      switch (def.rule) {
        case "contributions": hit = ++n >= t; break;
        case "merged": if (c.state === "merged") hit = ++n >= t; break;
        case "houses": seen.add(c.house); hit = seen.size >= t; break;
        case "providers": if (c.provider !== "self") { seen.add(c.provider); hit = seen.size >= t; } break;
        case "kind": if (c.kind === def.kind) hit = ++n >= t; break;
        case "verified-self": if (c.provider === "self") hit = ++n >= t; break;
      }
      if (hit) { at = new Date(c.occurredAt); break; }
    }
    if (at) reached.push({ def, at }); else next.push(def);
  }
  return { reached, next };
}
