import { HOUSES, PORTAL_URL, house, type HouseId } from "@/lib/houses";

// Shared brand constant: every property ends with this bar, current house highlighted.
// Markup is identical across properties. Each app styles `.collective-bar` in its own voice.
// KEEP THIS FILE IDENTICAL IN ALL APPS — the seven houses, the contributor portal and accounts.

/**
 * The row linking to every other property is hidden for now.
 *
 * Flip this to `true` to bring it back: nothing else has to change, and the links stay in the
 * markup below rather than being deleted. Typed as `boolean` rather than left to infer `false`,
 * so the branch below stays live code and keeps being type-checked.
 *
 * The fine print underneath — copyright, privacy, terms — is not part of this and still shows.
 */
const SHOW_PROPERTIES: boolean = false;

export function CollectiveBar({ current, title = "Part of the Islamic Tech Collective" }: { current: HouseId | "portal" | "accounts"; title?: string }) {
  const site = house("site").url;
  return (
    <footer className="collective-bar">
      {SHOW_PROPERTIES && (
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
      )}
      <p className="cb-fine">
        © {new Date().getFullYear()} Islamic Tech Collective · <a href={`${site}/privacy`}>Privacy</a> · <a href={`${site}/terms`}>Terms</a>
      </p>
    </footer>
  );
}
