# Islamic Tech Collective — Brand System

ITC is one collective made of **five houses**. The brand works like a family: every house shares the
same bones (mark, Arabic word-sign, palette roots, footer), but each has its own voice: typeface,
layout and color temperature. A visitor should know which house they are in at a glance, and also
see that it belongs to ITC.

---

## 1. Constants (shared by every property)

### The mark: *Khatam*
An eight-pointed star made of two overlapping squares (the *khātam*, as in Rub el Hizb). It is one of
the oldest motifs in Islamic geometric art and is built only with a compass and straightedge. That fits
a tech collective: the star is a rule-based construction, close to an algorithm.

- **Outer form never changes.** It is a 16-vertex star outline drawn on a 100×100 grid.
- **The center changes per house.** That gives each house its own glyph:

| House | Center of the Khatam | Meaning |
|---|---|---|
| Collective (site) | Solid dot | The one center everything turns around |
| AI | Four linked nodes | A network that thinks |
| Engineering | Crosshair | Precision, measurement |
| Institute | A smaller nested star | Centers inside a center |
| Open Source | Outline broken at the top | Open, with room to enter |
| Research | Concentric rings | Inquiry spreading outward |

Clear space is ½ the mark's width. Minimum size is 20px.

### The Arabic word-sign
Each house carries one Arabic word set in **Reem Kufi**, a modern Kufic face. It sits beside the
wordmark or in the hero:

| House | Word | Transliteration | Sense |
|---|---|---|---|
| Collective | جماعة | jamāʿa | collective, community |
| AI | ذكاء | dhakāʾ | intelligence |
| Engineering | هندسة | handasa | engineering, and also *geometry* |
| Institute | معهد | maʿhad | institute |
| Open Source | مشاع | mashāʿ | the commons, shared property |
| Research | بحث | baḥth | research, inquiry |

> Have a native Arabic speaker check these before launch.

### Palette roots
All house colors come from one master palette, drawn from manuscript illumination and tilework:

| Token | Hex | Source |
|---|---|---|
| `ink` | `#14201B` | Iron-gall ink |
| `parchment` | `#F3EDE0` | Manuscript paper |
| `emerald` | `#0F5C4D` | Iznik green |
| `gold` | `#B8862F` | Illumination gold leaf |
| `lapis` | `#2F4BD6` | Lapis lazuli pigment |
| `pomegranate` | `#7A1F2B` | Madder red |
| `saffron` | `#E35D0F` | Saffron, Iznik tomato-red |
| `turquoise` | `#2EC4B6` | Persian turquoise tile |
| `mint` | `#C6F432` | Modern signal color (OSS only) |

### Shared footer
Every property ends with the **Collective bar**. It links to all six properties, and the current house
is highlighted. This is the one place where all the houses meet.

---

## 2. The houses

| | Collective | AI | Engineering | Institute | Open Source | Research |
|---|---|---|---|---|---|---|
| **Folder** | `site/` | `ai/` | `engineering/` | `institute/` | `oss/` | `research/` |
| **Display font** | Fraunces | Space Grotesk | IBM Plex Sans | Cormorant Garamond | Archivo Black | Newsreader |
| **Body / utility** | Manrope | JetBrains Mono | IBM Plex Mono | Work Sans | Space Mono | Inter Tight |
| **Theme** | Warm light | Dark | Blueprint light | Cream light | Black | Paper white |
| **Primary** | Emerald | Lapis | Saffron | Pomegranate | Mint | Lapis-ink |
| **Secondary** | Gold | Turquoise | Ink | Gold | White | Saffron |
| **Layout** | Editorial hub, bento grid | Cinematic, centered, full-bleed | Docs: fixed sidebar + 12-col grid | Symmetric, arch frames | Brutalist bordered grid | Journal: masthead + index |
| **Motion** | Slow rotating star | Generative lattice canvas, typed demo | None (static precision) | Gentle fades | Marquee, hard hovers | None |
| **Voice** | Warm, inviting, plural | Measured, principled | Direct, specific | Scholarly, generous | Loud, informal, imperative | Precise, understated |

### Voice examples
- **Collective:** "Technology, built with intention, in service of people."
- **AI:** "Intelligence, with intention."
- **Engineering:** "Build it right. Then build it to last."
- **Institute:** "A home for the centers that carry the work forward."
- **Open Source:** "FORK IT. FIX IT. SHIP IT."
- **Research:** "Careful questions, published in the open."

---

## 3. Rules
1. Never change the outer star. Only the center varies.
2. Never use one house's display font in another house. The Collective site is the one exception: it
   shows each house in that house's own type.
3. Gold is for accents: rules, small marks, highlights. Never use it for body text.
4. Arabic is used for meaning, not decoration. Always put a transliteration or translation near it.
5. Geometric patterns are construction-true: built from the star, never random ornament.
6. Content in these builds is **placeholder**. Swap in real programs, names and numbers before launch.

## 4. Implementation

Each house is a **standalone Next.js 16 + TypeScript app** (App Router) in its own folder, with its own
`package.json` and `node_modules`. There is no shared workspace, so each one deploys on its own.

| Folder | Dev port | Env var for its public URL |
|---|---|---|
| `site/` | 3000 | `NEXT_PUBLIC_ITC_SITE_URL` |
| `ai/` | 3001 | `NEXT_PUBLIC_ITC_AI_URL` |
| `engineering/` | 3002 | `NEXT_PUBLIC_ITC_ENGINEERING_URL` |
| `institute/` | 3003 | `NEXT_PUBLIC_ITC_INSTITUTE_URL` |
| `oss/` | 3004 | `NEXT_PUBLIC_ITC_OSS_URL` |
| `research/` | 3005 | `NEXT_PUBLIC_ITC_RESEARCH_URL` |

Run any app with `cd <folder> && npm install && npm run dev`. Cross-links default to the localhost ports
above. Set the six env vars in every deployment, for example `NEXT_PUBLIC_ITC_AI_URL=https://ai.itc.org`.

Brand constants are copied into every app. **Keep these identical across all six:**
- `components/Khatam.tsx`: the mark and its per-house centers
- `components/CollectiveBar.tsx`: the shared footer
- `lib/houses.ts`: names, Arabic word-signs and URLs

Fonts load through `next/font/google`, so they are self-hosted at build time.
