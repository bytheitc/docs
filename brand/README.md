# The ITC logo

The mark is the Arabic letter **nūn** (ن), set in a disc.

`itc-mark.svg` is the only hand-made file here. It was traced at full resolution from the
original artwork — `itc-logo.png` at the repo root — and the trace is accurate to well under
a pixel at 420px. Everything else in every project is generated from it.

## Regenerating

```
python3 brand/generate.py
```

This rewrites all 60 files. Needs:

- **fontTools** (`pip install fonttools`)
- **Clash Display Medium**, the wordmark face — from [Fontshare](https://www.fontshare.com/fonts/clash-display),
  free for commercial use. The script expects `~/Library/Fonts/ClashDisplay-Medium.otf`;
  point `ITC_BRAND_FONT` at it elsewhere.

The font is only needed to *generate*. Wordmarks are outlined to paths, so no shipped file
loads a font and nothing shifts if the font is missing on a reader's machine. No font binary
is committed.

Colours and house names live in the `HOUSES` table in `generate.py`. Change them there, not
in the SVGs.

## What each project gets

In `<house>/web/public/` (and `status/brand/`, since status is an api that serves no static
files):

| File | What it is |
|---|---|
| `itc-mark.svg` | The collective mark, as supplied: black nūn, white disc. Identical everywhere. |
| `logo.svg` | This house's lockup — mark + house name — in the house's own colours, for its own pages. |
| `logo-inverse.svg` | The same lockup for the opposite background. |
| `mark.svg` | The mark alone in the house's colours, for favicons and tight spaces. |
| `logo-mono.svg` | The lockup in one colour, with the nūn cut out of the disc. |
| `mark-mono.svg` | The mark in one colour, same knockout. |

The two `-mono` files carry `fill="currentColor"`, so inlining them takes the surrounding text
colour and using them as an `<img>` falls back to black. To recolour one without inlining it,
mask it — `background: <colour>; mask: url(mark-mono.svg) center / contain no-repeat` — which
keeps the nūn transparent.

`site/web/public/brand/` additionally holds every house's lockup, because the Collective's
`/brand` page shows them all.

## Geometry

All measurements are in a coordinate system where the disc spans 0–100 (centre 50,50, r=50).
They were taken from `itclogo-engineering.png`, the lockup supplied as the style reference.

| | |
|---|---|
| nūn height | 63.4% of the disc diameter |
| nūn width | 53.5% of the disc diameter |
| nūn position | horizontally centred; 1.07% of the diameter above the disc's centre |
| wordmark cap height | 42.1 |
| wordmark baseline | y = 68.85 |
| disc edge → first letter | 20.4 |

Clear space on every side is half the disc's diameter. Minimum size is a 20px disc.

## Rules

1. Never redraw the nūn. Scale `itc-mark.svg`; don't trace it again.
2. The disc is always a full circle. Never crop it, never put the nūn on its own.
3. Each house uses its own colourway. Never put one house's colours on another's lockup.
4. Two colours per lockup, plus the wordmark. No gradients, no shadows, no outlines.
5. On a photograph, use `logo-inverse.svg` over a solid panel rather than the bare mark.

## Open question

`BRAND.md` and the eight copies of `components/Khatam.tsx` describe the mark as a *khātam* —
an eight-pointed star with a different centre per house. That was the brand system before this
artwork existed, and it is still what every site draws in its headers and its press kit. The
nūn and the khātam are currently both in use and the documents disagree about which is the
mark. That needs a decision; it was not made here.
