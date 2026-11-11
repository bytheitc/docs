import { HOUSES, PORTAL_URL, house, type HouseId } from "@/lib/houses";

// Shared brand constant: every property ends with this bar, current house highlighted.
// Markup is identical across properties. Each app styles `.collective-bar` in its own voice.
// KEEP THIS FILE IDENTICAL IN ALL APPS (the six houses and the contributor portal).
export function CollectiveBar({ current, title = "Part of the Islamic Tech Collective" }: { current: HouseId | "portal"; title?: string }) {
  const site = house("site").url;
  return (
    <footer className="collective-bar">
      <div className="cb-inner">
        <span className="cb-title">{title}</span>
        <nav aria-label="Islamic Tech Collective properties">
          {HOUSES.map((h) => (
            <a key={h.id} href={h.url} className={h.id === current ? "current" : undefined} aria-current={h.id === current ? "page" : undefined}>
              {h.name}
            </a>
          ))}
          <a href={PORTAL_URL} className={current === "portal" ? "current cb-portal" : "cb-portal"} aria-current={current === "portal" ? "page" : undefined}>
            Contribute
          </a>
        </nav>
      </div>
      <p className="cb-fine">
        © {new Date().getFullYear()} Islamic Tech Collective · <a href={`${site}/privacy`}>Privacy</a> · <a href={`${site}/terms`}>Terms</a> · Content shown is placeholder.
      </p>
    </footer>
  );
}
