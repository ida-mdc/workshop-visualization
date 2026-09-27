#!/usr/bin/env python3
"""The figure for "the same spatial hierarchy, three different node contents."

The octree/quadtree is a container, not a data type - the same subdivision
pattern shows up whether a leaf node holds points, mesh fragments, or a
simulation cell. This draws that literally: three panels, the identical
quadtree split (same recursion as tools/make-dense-vs-sparse.py's sparse
panel, same "surface" curve), with only what is drawn inside each finest
cell changing between panels.

    tools/make-hierarchy-content.py [out-file]

Default out-file is static/img/hierarchy-content.svg. Re-running overwrites.
"""
import math
import sys
from pathlib import Path

DARK = "#232430"
GREY = "#9a9aa4"
LIGHT = "#dcdce4"
BLUE = "#0059a0"
ICE = "#bcd8ea"
TEAL = "#1f7a8c"
AMBER = "#e2a13c"

PANEL = 170
GAP = 26
PAD = 12
W = PANEL * 3 + GAP * 2 + PAD * 2
H = PANEL + 56

HEAD = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" '
        'font-family="ui-sans-serif, system-ui, sans-serif">\n')
TAIL = "</svg>\n"


def touches_curve(cx, cy, half):
    steps = 40
    for i in range(steps + 1):
        t = i / steps
        px = t
        py = 0.5 + 0.28 * math.sin(t * math.pi * 2.1)
        if abs(px - cx) <= half + 0.01 and abs(py - cy) <= half + 0.01:
            return True
    return False


def leaves():
    out = []

    def recurse(cx, cy, half, depth):
        hit = touches_curve(cx, cy, half)
        if depth == 4 or not hit:
            out.append((cx, cy, half, hit))
            return
        h = half / 2
        for sx in (-1, 1):
            for sy in (-1, 1):
                recurse(cx + sx * h, cy + sy * h, h, depth + 1)

    recurse(0.5, 0.5, 0.5, 0)
    return out


def panel(x0, y0, title, content):
    p = [f'<text x="{x0 + PANEL / 2}" y="{y0 - 14}" text-anchor="middle" '
         f'font-size="14" font-weight="600" fill="{DARK}">{title}</text>']
    for cx, cy, half, hit in leaves():
        side = half * 2 * PANEL
        px = x0 + (cx - half) * PANEL
        py = y0 + (cy - half) * PANEL
        fill = ICE if not hit else "none"
        p.append(f'<rect x="{px:.1f}" y="{py:.1f}" width="{side:.1f}" height="{side:.1f}" '
                 f'fill="{fill}" fill-opacity="0.25" stroke="{GREY}" stroke-width="0.7"/>')
        if hit:
            p.append(content(px, py, side))
    p.append(f'<rect x="{x0}" y="{y0}" width="{PANEL}" height="{PANEL}" '
             f'fill="none" stroke="{DARK}" stroke-width="1.3"/>')
    return "".join(p)


def points_content(px, py, side):
    # A few scattered dots - what a point-cloud node actually stores.
    import random
    rng = random.Random(int(px * 7 + py * 13))
    dots = []
    for _ in range(max(3, int(side / 6))):
        x = px + rng.uniform(0.15, 0.85) * side
        y = py + rng.uniform(0.15, 0.85) * side
        dots.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="1.1" fill="{BLUE}"/>')
    return "".join(dots)


def mesh_content(px, py, side):
    # A small triangle fan - a mesh fragment, not a filled block.
    x0, y0, x1, y1, x2 = px + side * 0.15, py + side * 0.85, px + side * 0.85, py + side * 0.85, px + side * 0.5
    y2 = py + side * 0.15
    return (f'<polygon points="{x0:.1f},{y0:.1f} {x1:.1f},{y1:.1f} {x2:.1f},{y2:.1f}" '
            f'fill="none" stroke="{TEAL}" stroke-width="1.1"/>'
            f'<line x1="{px + side * 0.5:.1f}" y1="{py + side * 0.85:.1f}" '
            f'x2="{px + side * 0.5:.1f}" y2="{py + side * 0.15:.1f}" stroke="{TEAL}" stroke-width="0.8"/>')


def cell_content(px, py, side):
    # A solid, filled cell - a computational element, not a sample of one.
    return (f'<rect x="{px + 1:.1f}" y="{py + 1:.1f}" width="{side - 2:.1f}" height="{side - 2:.1f}" '
            f'fill="{AMBER}" fill-opacity="0.75"/>')


def main(out: Path):
    y0 = 40
    parts = [
        panel(PAD, y0, "Point cloud", points_content),
        panel(PAD + PANEL + GAP, y0, "Surface mesh", mesh_content),
        panel(PAD + 2 * (PANEL + GAP), y0, "Simulation mesh", cell_content),
    ]
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(HEAD + "".join(parts) + TAIL)
    print(f"wrote {out}")


if __name__ == "__main__":
    main(Path(sys.argv[1]) if len(sys.argv) > 1 else Path("static/img/hierarchy-content.svg"))
