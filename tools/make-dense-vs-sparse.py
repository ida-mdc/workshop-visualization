#!/usr/bin/env python3
"""The side-by-side figure on the "from dense volumes to sparse 3D data" slide.

Two panels, same size square, same style as static/icons/stream/: flat
shapes, the deck's palette, no strokes finer than 0.8 so they hold up
projected.

Left: a dense volume - every cell filled, so a uniform chunk grid costs
nothing to address and wastes nothing. Right: sparse geometry - a single
wavy "surface" through empty space, subdivided the way the octree-build
scene actually subdivides one: small cells hugging the curve, large ones
everywhere else. This is the one general idea the Armadillo octree demo,
two slides later, makes concrete on a real scan.

    tools/make-dense-vs-sparse.py [out-file]

Default out-file is static/img/dense-vs-sparse.svg. Re-running overwrites.
"""
import sys
from pathlib import Path

DARK = "#232430"
GREY = "#9a9aa4"
LIGHT = "#dcdce4"
BLUE = "#0059a0"
ICE = "#bcd8ea"
TEAL = "#1f7a8c"

PANEL = 200
GAP = 40
PAD = 12
W = PANEL * 2 + GAP + PAD * 2
H = PANEL + 56

HEAD = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" '
        'font-family="ui-sans-serif, system-ui, sans-serif">\n')
TAIL = "</svg>\n"


def dense_value(r, c, n):
    """A synthetic density field, not a checkerboard - every cell of a dense
    volume actually holds a different sample, unlike the on/off pattern a
    two-color tiling implies. A soft blob plus a little per-cell texture."""
    import math
    cx, cy = (n - 1) / 2, (n - 1) / 2
    d = math.hypot(r - cx, c - cy) / (n / 2)
    blob = math.exp(-2.2 * d * d)
    texture = 0.12 * math.sin(r * 1.7 + c * 2.3)
    return max(0.08, min(1.0, blob + texture))


def dense_panel(x0, y0):
    n = 6
    cell = PANEL / n
    p = [f'<text x="{x0 + PANEL / 2}" y="{y0 - 14}" text-anchor="middle" '
         f'font-size="15" font-weight="600" fill="{DARK}">Dense volume</text>']
    for r in range(n):
        for c in range(n):
            v = dense_value(r, c, n)
            p.append(f'<rect x="{x0 + c * cell:.1f}" y="{y0 + r * cell:.1f}" '
                     f'width="{cell:.1f}" height="{cell:.1f}" fill="{BLUE}" '
                     f'fill-opacity="{v:.2f}" stroke="{LIGHT}" stroke-width="0.8"/>')
    p.append(f'<rect x="{x0}" y="{y0}" width="{PANEL}" height="{PANEL}" '
             f'fill="none" stroke="{DARK}" stroke-width="1.4"/>')
    return "".join(p)


# A quadtree that only refines near a wavy "surface" curve - the same rule
# static/js/viz/scenes/octree-build.js applies in 3D, drawn once, in 2D, by
# hand-picked recursion so it does not need a build step of its own.
def touches_curve(cx, cy, half):
    import math
    # The "surface": a sine wave through the panel, in [0,1] local coords.
    steps = 40
    for i in range(steps + 1):
        t = i / steps
        px = t
        py = 0.5 + 0.28 * math.sin(t * math.pi * 2.1)
        if abs(px - cx) <= half + 0.01 and abs(py - cy) <= half + 0.01:
            return True
    return False


def sparse_panel(x0, y0):
    import math
    p = [f'<text x="{x0 + PANEL / 2}" y="{y0 - 14}" text-anchor="middle" '
         f'font-size="15" font-weight="600" fill="{DARK}">Sparse geometry</text>']
    leaves = []

    def recurse(cx, cy, half, depth):
        hit = touches_curve(cx, cy, half)
        if depth == 4 or not hit:
            leaves.append((cx, cy, half, hit))
            return
        h = half / 2
        for sx in (-1, 1):
            for sy in (-1, 1):
                recurse(cx + sx * h, cy + sy * h, h, depth + 1)

    recurse(0.5, 0.5, 0.5, 0)

    for cx, cy, half, hit in leaves:
        side = half * 2 * PANEL
        px = x0 + (cx - half) * PANEL
        py = y0 + (cy - half) * PANEL
        if hit:
            p.append(f'<rect x="{px:.1f}" y="{py:.1f}" width="{side:.1f}" height="{side:.1f}" '
                     f'fill="{TEAL}" fill-opacity="0.85" stroke="{LIGHT}" stroke-width="0.8"/>')
        else:
            p.append(f'<rect x="{px:.1f}" y="{py:.1f}" width="{side:.1f}" height="{side:.1f}" '
                     f'fill="{ICE}" fill-opacity="0.25" stroke="{GREY}" stroke-width="0.8"/>')

    # The curve itself, on top, so it reads as the reason for the pattern.
    pts = []
    steps = 60
    for i in range(steps + 1):
        t = i / steps
        px = x0 + t * PANEL
        py = y0 + (0.5 + 0.28 * math.sin(t * math.pi * 2.1)) * PANEL
        pts.append(f"{px:.1f},{py:.1f}")
    p.append(f'<polyline points="{" ".join(pts)}" fill="none" stroke="{DARK}" stroke-width="1.6"/>')
    p.append(f'<rect x="{x0}" y="{y0}" width="{PANEL}" height="{PANEL}" '
             f'fill="none" stroke="{DARK}" stroke-width="1.4"/>')
    return "".join(p)


def main(out: Path):
    x0 = PAD
    x1 = PAD + PANEL + GAP
    y0 = 40
    svg = HEAD + dense_panel(x0, y0) + sparse_panel(x1, y0) + TAIL
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(svg)
    print(f"wrote {out}")


if __name__ == "__main__":
    main(Path(sys.argv[1]) if len(sys.argv) > 1 else Path("static/img/dense-vs-sparse.svg"))
