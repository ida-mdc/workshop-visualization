#!/usr/bin/env python3
"""The classic "1 cell -> 8 children -> 64 grandchildren" octree figure.

The kind of picture Wikipedia's octree article has, made from scratch: three
isometric cubes side by side, each one subdivided one level further than the
last. The math is one honest simplification: an isometric projection is
affine, so a quad's own interior grid lines can be built by interpolating
its four already-projected corners in 2D, without ever touching 3D again.

    tools/make-octree-depiction.py [out-file]

Default out-file is static/img/octree-depiction.svg. Re-running overwrites.
"""
import math
import sys
from pathlib import Path

DARK = "#232430"
BLUE = "#0059a0"

COS30 = math.cos(math.radians(30))
SIN30 = math.sin(math.radians(30))

PANEL_W = 220
GAP = 10
PAD = 24
SCALE = 92
# An isometric cube of side SCALE reaches SCALE above and SCALE below the
# origin its projection is anchored on, so the panel has to be 2*SCALE tall
# before the caption under it is counted. Both of these were wrong: W left
# out the padding, which pushed the last cube against the right edge, and the
# captions were placed half a cube up, printed across the front faces.
W = PAD * 2 + PANEL_W * 3 + GAP * 2
LABEL_DROP = 26
H = SCALE * 2 + LABEL_DROP + 30


def iso(x, y, z, ox, oy, s=SCALE):
    px = ox + (x - z) * s * COS30
    py = oy + (x + z) * s * SIN30 - y * s
    return (px, py)


def lerp(p, q, t):
    return (p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t)


def quad_grid_lines(a, b, c, d, n):
    """a-b-c-d is the quad's boundary in order. n-1 lines each direction."""
    lines = []
    for i in range(1, n):
        t = i / n
        lines.append((lerp(a, d, t), lerp(b, c, t)))
        lines.append((lerp(a, b, t), lerp(d, c, t)))
    return lines


def pts(*p):
    return " ".join(f"{x:.1f},{y:.1f}" for x, y in p)


def cube(ox, oy, n, label):
    p = []
    top = [iso(0, 1, 0, ox, oy), iso(1, 1, 0, ox, oy), iso(1, 1, 1, ox, oy), iso(0, 1, 1, ox, oy)]
    right = [iso(1, 0, 0, ox, oy), iso(1, 1, 0, ox, oy), iso(1, 1, 1, ox, oy), iso(1, 0, 1, ox, oy)]
    front = [iso(0, 0, 1, ox, oy), iso(1, 0, 1, ox, oy), iso(1, 1, 1, ox, oy), iso(0, 1, 1, ox, oy)]

    for face, op in ((top, 0.20), (right, 0.85), (front, 0.55)):
        p.append(f'<polygon points="{pts(*face)}" fill="{BLUE}" fill-opacity="{op}" '
                 f'stroke="{DARK}" stroke-width="1.3"/>')

    if n > 1:
        for face in (top, right, front):
            for p1, p2 in quad_grid_lines(*face, n):
                p.append(f'<line x1="{p1[0]:.1f}" y1="{p1[1]:.1f}" x2="{p2[0]:.1f}" y2="{p2[1]:.1f}" '
                         f'stroke="{DARK}" stroke-width="0.8" stroke-opacity="0.75"/>')

    label_y = oy + SCALE + LABEL_DROP      # SCALE below oy is the lowest corner
    p.append(f'<text x="{ox}" y="{label_y:.1f}" text-anchor="middle" font-size="15" '
              f'font-weight="700" fill="{DARK}">{label}</text>')
    return "".join(p)


def main(out: Path):
    head = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" '
            'font-family="ui-sans-serif, system-ui, sans-serif">\n')
    tail = "</svg>\n"
    cy = SCALE + 16                        # 16px of air above the tallest corner
    centers = [PAD + PANEL_W / 2, PAD + PANEL_W + GAP + PANEL_W / 2, PAD + 2 * (PANEL_W + GAP) + PANEL_W / 2]
    panels = [
        cube(centers[0], cy, 1, "1 cell"),
        cube(centers[1], cy, 2, "8 children"),
        cube(centers[2], cy, 4, "64 grandchildren"),
    ]
    arrows = []
    for cx in (centers[0] + PANEL_W / 2 - 4, centers[1] + PANEL_W / 2 - 4):
        y = cy + 7             # centred on the cube body, not on its top half
        arrows.append(f'<text x="{cx + GAP / 2:.1f}" y="{y:.1f}" text-anchor="middle" '
                       f'font-size="20" fill="{DARK}">&#8594;</text>')
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(head + "".join(panels) + "".join(arrows) + tail)
    print(f"wrote {out}")


if __name__ == "__main__":
    main(Path(sys.argv[1]) if len(sys.argv) > 1 else Path("static/img/octree-depiction.svg"))
