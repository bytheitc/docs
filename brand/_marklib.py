"""Geometry for the ITC logo: the traced nun mark, and wordmarks outlined from Clash Display.

Used by generate.py. The measurements below were taken from the original artwork
(itc-logo.png and itclogo-engineering.png, both kept at the repo root).
"""
import os, json
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.misc.transform import Transform

# The wordmark is set in Clash Display Medium (Fontshare, free for commercial use) and
# outlined to paths here, so nothing ships a font file and nothing depends on one loading.
FONT = os.environ.get("ITC_BRAND_FONT", os.path.expanduser("~/Library/Fonts/ClashDisplay-Medium.otf"))
def _load_mark():
    """The traced nun, read back out of the canonical itc-mark.svg next to this file."""
    import re
    svg = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "itc-mark.svg")).read()
    m = re.search(r'<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"/>\s*<path d="([^"]+)"', svg)
    if not m: raise SystemExit("brand/itc-mark.svg: could not read the mark geometry")
    cx, cy, r, bowl = m.groups()
    return {"bowl": bowl, "dot": [float(cx), float(cy), float(r)]}

MARK = _load_mark()

# Geometry measured from itclogo-engineering.png, in a system where the disc spans 0..100.
CAP      = 42.1    # wordmark cap height
BASELINE = 68.85   # wordmark baseline
GAP      = 20.4    # disc right edge -> start of the word

_f = TTFont(FONT)
_upm = _f["head"].unitsPerEm
_cap_fu = _f["OS/2"].sCapHeight
_cmap = _f.getBestCmap()
_gs = _f.getGlyphSet()

def _ink_bounds(text, cap, baseline, x0):
    """Ink bounding box of the laid-out word, in final units."""
    from fontTools.pens.boundsPen import BoundsPen
    sc = cap / _cap_fu
    x = 0.0; box = None
    for ch in text:
        gn = _cmap.get(ord(ch))
        if ch != " ":
            bp = BoundsPen(_gs)
            _gs[gn].draw(TransformPen(bp, Transform(sc, 0, 0, -sc, x0 + x * sc, baseline)))
            if bp.bounds:
                box = bp.bounds if box is None else (
                    min(box[0], bp.bounds[0]), min(box[1], bp.bounds[1]),
                    max(box[2], bp.bounds[2]), max(box[3], bp.bounds[3]))
        x += _gs[gn].width
    return box


def _kern_pairs(font):
    """(left, right) -> xAdvance, from GPOS pair positioning (formats 1 and 2)."""
    out = {}
    if "GPOS" not in font: return out
    gpos = font["GPOS"].table
    lookups = gpos.LookupList.Lookup if gpos.LookupList else []
    def classdefs(cd):
        d = {}
        if cd is not None:
            for g, c in cd.classDefs.items(): d[g] = c
        return d
    for lk in lookups:
        if lk.LookupType != 2: continue
        for st in lk.SubTable:
            if st.Format == 1:
                for i, g1 in enumerate(st.Coverage.glyphs):
                    ps = st.PairSet[i]
                    for pvr in ps.PairValueRecord:
                        v = pvr.Value1
                        if v is not None and getattr(v, "XAdvance", 0):
                            out[(g1, pvr.SecondGlyph)] = v.XAdvance
            elif st.Format == 2:
                c1 = classdefs(st.ClassDef1); c2 = classdefs(st.ClassDef2)
                cov = set(st.Coverage.glyphs)
                for g1 in cov:
                    k1 = c1.get(g1, 0)
                    if k1 >= len(st.Class1Record): continue
                    rec1 = st.Class1Record[k1]
                    for g2, k2 in list(c2.items()) + [(g, 0) for g in cov]:
                        if k2 >= len(rec1.Class2Record): continue
                        v = rec1.Class2Record[k2].Value1
                        if v is not None and getattr(v, "XAdvance", 0):
                            out[(g1, g2)] = v.XAdvance
    return out

_KERN = _kern_pairs(_f)

def word(text, cap=CAP, baseline=BASELINE, x0=0.0):
    """Outline `text` as one SVG path whose ink starts exactly at x0.
    Returns (d, ink_width). Clash Display carries no kerning, so plain advances are correct."""
    b = _ink_bounds(text, cap, baseline, x0)
    x0 = x0 + (x0 - b[0])          # shift so the first ink lands on x0
    ink_w = b[2] - b[0]
    s = cap / _cap_fu
    pen_d = []
    x = 0.0
    prev = None
    for ch in text:
        gn = _cmap.get(ord(ch))
        if gn is None: raise KeyError(f"no glyph for {ch!r}")
        if prev is not None:
            x += _KERN.get((prev, gn), 0)
        if ch != " ":
            sp = SVGPathPen(_gs, ntos=lambda v: f"{v:.3f}".rstrip("0").rstrip("."))
            tp = TransformPen(sp, Transform(s, 0, 0, -s, x0 + x * s, baseline))
            _gs[gn].draw(tp)
            pen_d.append(sp.getCommands())
        x += _gs[gn].width
        prev = gn
    return "".join(pen_d), ink_w

def mark_svg(disc, ink, x=0.0):
    cx, cy, r = MARK["dot"]
    g = "" if x == 0 else f' transform="translate({x:.3f} 0)"'
    return (f'<g{g}><circle cx="50" cy="50" r="50" fill="{disc}"/>'
            f'<g fill="{ink}"><circle cx="{cx:.4f}" cy="{cy:.4f}" r="{r:.4f}"/>'
            f'<path d="{MARK["bowl"]}"/></g></g>')

def lockup(text, disc, ink, word_fill, label):
    d, w = word(text, x0=100 + GAP)
    W = 100 + GAP + w
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:.2f} 100" '
            f'width="{W:.2f}" height="100" role="img" aria-label="{label}">'
            f'<title>{label}</title>'
            f'{mark_svg(disc, ink)}'
            f'<path d="{d}" fill="{word_fill}"/></svg>\n')

def mark_only(disc, ink, label):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" '
            f'width="100" height="100" role="img" aria-label="{label}">'
            f'<title>{label}</title>{mark_svg(disc, ink)}</svg>\n')

def _circle_path(cx, cy, r):
    """A circle as a path, so it can share a fill-rule with the rest of the mark."""
    return (f"M{cx - r:.4f} {cy:.4f}"
            f"A{r:.4f} {r:.4f} 0 1 0 {cx + r:.4f} {cy:.4f}"
            f"A{r:.4f} {r:.4f} 0 1 0 {cx - r:.4f} {cy:.4f}Z")


def mark_knockout(x=0.0):
    """The mark as ONE path: a filled disc with the nun cut out of it, so whatever is
    behind the logo shows through the letter. One colour, any background."""
    cx, cy, r = MARK["dot"]
    return (_circle_path(50, 50, 50) + _circle_path(cx, cy, r) + MARK["bowl"])


def mono_lockup(text, label, fill="currentColor"):
    """Lockup in a single colour, the nun knocked out of the disc."""
    d, w = word(text, x0=100 + GAP)
    W = 100 + GAP + w
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:.2f} 100" '
            f'width="{W:.2f}" height="100" fill="{fill}" role="img" aria-label="{label}">'
            f'<title>{label}</title>'
            f'<path fill-rule="evenodd" d="{mark_knockout()}"/>'
            f'<path d="{d}"/></svg>\n')


def mono_mark(label, fill="currentColor"):
    """The mark alone, one colour, nun knocked out."""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" '
            f'width="100" height="100" fill="{fill}" role="img" aria-label="{label}">'
            f'<title>{label}</title>'
            f'<path fill-rule="evenodd" d="{mark_knockout()}"/></svg>\n')
