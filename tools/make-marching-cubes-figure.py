#!/usr/bin/env python3
"""The corner-pattern figure on the "Marching Cubes" slide, replacing a
generic borrowed diagram with one built for this deck.

Eight representative corner patterns of the 2D case - marching squares,
which is exactly the same table-lookup idea marching cubes runs one
dimension up, with 4 corners and 16 patterns instead of 8 corners and 256.
Every crossing point here is a real linear interpolation between the two
corner *values* (not a fixed midpoint), because that is the specific claim
the slide's notes make and a figure that quietly placed every dot at 0.5
would be showing the wrong thing while describing the right one.

The last panel is the classic ambiguous case: two diagonal corners inside,
two outside, four crossings, and two different ways to join them into
segments - both drawn, one solid and one dashed, because a lookup table has
to pick one and a figure that hides the choice makes the ambiguity sound
made up.

    tools/make-marching-cubes-figure.py [out-file]

Default out-file is static/img/marching-cubes-cases.svg. Re-running
overwrites.
"""
import sys
from pathlib import Path

DARK = "#232430"
GREY = "#9a9aa4"
LIGHT = "#dcdce4"
BLUE = "#0059a0"
ICE = "#bcd8ea"
TEAL = "#1f7a8c"
ROSE = "#e2685f"

CELL = 108
GAP = 22
PAD = 16
COLS = 4
ROWS = 2
W = COLS * CELL + (COLS - 1) * GAP + PAD * 2
H = ROWS * (CELL + 46) + PAD

# Corners in order TL, TR, BR, BL. Positive = inside, negative = outside;
# magnitudes deliberately uneven so crossings land off-centre.
CASES = [
    ("Empty", (-1.0, -1.0, -1.0, -1.0)),
    ("Full", (1.0, 1.0, 1.0, 1.0)),
    ("One corner", (-1.0, -1.0, -1.0, 0.6)),
    ("One edge", (-1.0, -1.0, 0.7, 0.9)),
    ("Opposite corner", (-1.0, 0.5, -1.0, -1.0)),
    ("Adjacent pair", (0.8, -1.0, -1.0, 0.4)),
    ("Three corners", (0.6, -1.0, 0.9, 0.7)),
    ("Ambiguous", (0.5, -0.5, 0.6, -0.4)),
]

HEAD = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" '
        'font-family="ui-sans-serif, system-ui, sans-serif">\n')
TAIL = "</svg>\n"


def crossing(v0, v1):
    """Fraction 0..1 from the first corner where the value hits zero."""
    return max(0.0, min(1.0, v0 / (v0 - v1)))


def corner_points(vals):
    """TL, TR, BR, BL corner positions in a unit square, y down."""
    tl, tr, br, bl = (0, 0), (1, 0), (1, 1), (0, 1)
    return {"TL": (tl, vals[0]), "TR": (tr, vals[1]),
            "BR": (br, vals[2]), "BL": (bl, vals[3])}


def edge_crossing(corners, a, b):
    (pa, va), (pb, vb) = corners[a], corners[b]
    if (va > 0) == (vb > 0):
        return None
    t = crossing(va, vb)
    return (pa[0] + t * (pb[0] - pa[0]), pa[1] + t * (pb[1] - pa[1]))


def segments_for(name, corners):
    top = edge_crossing(corners, "TL", "TR")
    right = edge_crossing(corners, "TR", "BR")
    bottom = edge_crossing(corners, "BR", "BL")
    left = edge_crossing(corners, "BL", "TL")

    solid, dashed = [], []
    if name == "Empty" or name == "Full":
        pass
    elif name == "One corner":
        solid.append((bottom, left))
    elif name == "One edge":
        solid.append((left, right))
    elif name == "Opposite corner":
        solid.append((top, right))
    elif name == "Adjacent pair":
        solid.append((top, bottom))
    elif name == "Three corners":
        solid.append((top, right))
    elif name == "Ambiguous":
        # Four crossings, two ways to pair them - a lookup table has to
        # commit to one. Both drawn; the chosen one solid, the other dashed.
        solid.append((top, left))
        solid.append((right, bottom))
        dashed.append((top, right))
        dashed.append((left, bottom))
    return solid, dashed, [p for p in (top, right, bottom, left) if p]


def panel(x0, y0, name, vals):
    corners = corner_points(vals)
    solid, dashed, crossings = segments_for(name, corners)

    def px(p):
        return x0 + p[0] * CELL, y0 + p[1] * CELL

    out = [f'<text x="{x0 + CELL / 2}" y="{y0 - 8}" text-anchor="middle" '
           f'font-size="12.5" font-weight="600" fill="{DARK}">{name}</text>']
    out.append(f'<rect x="{x0}" y="{y0}" width="{CELL}" height="{CELL}" '
               f'fill="none" stroke="{LIGHT}" stroke-width="1.2"/>')
    for a, b in dashed:
        (ax, ay), (bx, by) = px(a), px(b)
        out.append(f'<line x1="{ax:.1f}" y1="{ay:.1f}" x2="{bx:.1f}" y2="{by:.1f}" '
                   f'stroke="{ROSE}" stroke-width="1.6" stroke-dasharray="4 3" '
                   f'stroke-linecap="round" opacity="0.75"/>')
    for a, b in solid:
        (ax, ay), (bx, by) = px(a), px(b)
        out.append(f'<line x1="{ax:.1f}" y1="{ay:.1f}" x2="{bx:.1f}" y2="{by:.1f}" '
                   f'stroke="{BLUE}" stroke-width="2.6" stroke-linecap="round"/>')
    for p in crossings:
        cx, cy = px(p)
        out.append(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="3.2" fill="{ROSE}" '
                   f'stroke="#ffffff" stroke-width="1"/>')
    for key, (p, v) in corners.items():
        cx, cy = px(p)
        if v > 0:
            out.append(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="5" fill="{ICE}" '
                       f'stroke="{TEAL}" stroke-width="1.6"/>')
        else:
            out.append(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="3.6" fill="#ffffff" '
                       f'stroke="{GREY}" stroke-width="1.4"/>')
    return "".join(out)


def main(out):
    svg = [HEAD]
    for i, (name, vals) in enumerate(CASES):
        col, row = i % COLS, i // COLS
        x0 = PAD + col * (CELL + GAP)
        y0 = PAD + 26 + row * (CELL + 46)
        svg.append(panel(x0, y0, name, vals))
    svg.append(TAIL)
    Path(out).write_text("".join(svg))
    print(f"wrote {out}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "static/img/marching-cubes-cases.svg")
