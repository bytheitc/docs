#!/usr/bin/env python3
"""Generate every ITC logo file from one source of truth.

    python3 brand/generate.py

The mark itself is traced once, by hand, from the original artwork and lives in
brand/itc-mark.svg. Everything else — every house lockup, in every colourway, in
every project — is written by this script, so a colour or a name only ever changes
in the HOUSES table below.

Needs fontTools and Clash Display Medium installed (see brand/README.md).
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _marklib as G  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Each house's lockup: the word beside the mark, whether its pages are light or dark,
# and the three colours the lockup uses *on its own background*. The colours are the
# house's own tokens, read from its web/app/globals.css.
#
#   primary — the disc
#   surface — the nun knocked out of the disc; the house's page background
#   ink     — the wordmark
HOUSES = [
    # id             word                       theme    primary    surface    ink
    ("site",         "Islamic Tech Collective", "light", "#0F5C4D", "#F3EDE0", "#14201B"),
    ("ai",           "AI",                      "dark",  "#4C6FFF", "#070A14", "#E8ECFF"),
    ("engineering",  "Engineering",             "light", "#E35D0F", "#F5F5F0", "#111111"),
    ("health",       "Health",                  "light", "#2F6F5E", "#FBFBF8", "#15201C"),
    ("institute",    "Institute",               "light", "#7A1F2B", "#FAF6EF", "#2A1A1C"),
    ("oss",          "Open Source",             "dark",  "#C6F432", "#0B0B0B", "#FFFFFF"),
    ("research",     "Research",                "light", "#1F2A5A", "#FFFFFE", "#1F2A5A"),
    ("portal",       "Contributor Portal",      "light", "#0F5C4D", "#FCFAF5", "#14201B"),
    ("cms",          "Studio",                  "light", "#0F5C4D", "#F3EDE0", "#14201B"),
    ("status",       "Status",                  "light", "#272D38", "#FBFBFA", "#272D38"),
]

# The collective mark as supplied: a black nun in a white disc.
CANON_DISC, CANON_INK = "#FFFFFF", "#000000"

# status/ is an api with no web app and serves no static files, so its artwork is
# kept with the service rather than in a public/ directory nothing would read.
def dest(house_id):
    if house_id == "status":
        return os.path.join(ROOT, "status", "brand")
    return os.path.join(ROOT, house_id, "web", "public")


def colourways(theme, primary, surface, ink):
    """(on its own background, on the opposite background), each (disc, nun, word)."""
    own = (primary, surface, ink)
    if theme == "light":
        # On a dark background the disc goes light and the house colour moves into
        # the nun, which is how the original artwork is built.
        inverse = (surface, primary, surface)
    else:
        # A dark house's mark already reads on white; only the wordmark has to darken.
        inverse = (primary, surface, surface)
    return own, inverse


def main():
    written = []

    def write(path, text):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w") as fh:
            fh.write(text)
        written.append(os.path.relpath(path, ROOT))

    for house_id, word, theme, primary, surface, ink in HOUSES:
        own, inverse = colourways(theme, primary, surface, ink)
        label = ("Islamic Tech Collective" if house_id == "site"
                 else f"Islamic Tech Collective — {word}")
        out = dest(house_id)

        # The collective mark, identical in every project.
        write(f"{out}/itc-mark.svg", G.mark_only(CANON_DISC, CANON_INK, "Islamic Tech Collective"))
        # This house's lockup, for its own pages and for the opposite background.
        write(f"{out}/logo.svg", G.lockup(word, *own, label))
        write(f"{out}/logo-inverse.svg", G.lockup(word, *inverse, label))
        # The mark alone in the house's colours, for favicons and tight spaces.
        write(f"{out}/mark.svg", G.mark_only(own[0], own[1], label))
        # One colour, nun knocked out so the background shows through: for single-colour
        # print, etching, watermarks, and anywhere the two-colour disc cannot go. These
        # inherit `currentColor` when inlined, and fall back to black as an <img>.
        write(f"{out}/logo-mono.svg", G.mono_lockup(word, label))
        write(f"{out}/mark-mono.svg", G.mono_mark(label))

        # The site's brand page shows every house, so it needs every lockup.
        write(f"{ROOT}/site/web/public/brand/{house_id}.svg", G.lockup(word, *own, label))
        write(f"{ROOT}/site/web/public/brand/{house_id}-inverse.svg", G.lockup(word, *inverse, label))
        write(f"{ROOT}/site/web/public/brand/{house_id}-mono.svg", G.mono_lockup(word, label))

    print(f"{len(written)} files written")
    for path in written:
        print(f"  {path}")


if __name__ == "__main__":
    main()
