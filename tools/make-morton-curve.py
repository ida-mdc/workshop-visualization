#!/usr/bin/env python3
"""The "space-filling curve" figure on the meshes slide.

An 8x8 grid, one cell per number 0..63, numbered along a Morton (Z-order)
curve - the same ordering t8code uses for hex and quad elements. Colored from
the first cell visited (the deck's blue) to the last (the deck's red) and
connected in that order, so what the term buys you is visible rather than
asserted: follow the line and it stays inside one quadrant before it ever
moves to the next, which is what "nearby in the curve is usually nearby in
space" looks like.

    tools/make-morton-curve.py [out.svg]
"""
import sys
from pathlib import Path

N = 8            # cells per side
CELL = 34         # px
PAD = 10
BLUE = (0x00, 0x59, 0xa0)
RED = (0xe1, 0x46, 0x2c)
EDGE = "#3c4250"


def morton(x, y):
    """Interleave the bits of x and y - the Z-order index of cell (x, y)."""
    m = 0
    for i in range(3):
        m |= ((x >> i) & 1) << (2 * i)
        m |= ((y >> i) & 1) << (2 * i + 1)
    return m


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def build():
    side = N * CELL
    W = H = side + PAD * 2
    cells = [(x, y) for y in range(N) for x in range(N)]
    cells.sort(key=lambda c: morton(*c))

    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" '
             f'fill="none" stroke-linejoin="round" stroke-linecap="round">\n  ']

    centers = []
    for i, (x, y) in enumerate(cells):
        t = i / (len(cells) - 1)
        r, g, b = lerp(BLUE, RED, t)
        px, py = PAD + x * CELL, PAD + (N - 1 - y) * CELL
        parts.append(
            f'<rect x="{px:.1f}" y="{py:.1f}" width="{CELL - 2}" height="{CELL - 2}" '
            f'fill="rgb({r},{g},{b})" stroke="{EDGE}" stroke-width="0.6"/>')
        centers.append((px + CELL / 2, py + CELL / 2))

    path = " L ".join(f"{cx:.1f},{cy:.1f}" for cx, cy in centers)
    parts.append(f'<path d="M {path}" stroke="#1c1d24" stroke-width="2.2" '
                  f'stroke-opacity="0.82" fill="none"/>')

    sx, sy = centers[0]
    ex, ey = centers[-1]
    parts.append(f'<circle cx="{sx:.1f}" cy="{sy:.1f}" r="5.5" fill="#ffffff" '
                  f'stroke="{EDGE}" stroke-width="1.4"/>')
    parts.append(f'<circle cx="{ex:.1f}" cy="{ey:.1f}" r="5.5" fill="#1c1d24" '
                  f'stroke="{EDGE}" stroke-width="1.4"/>')

    parts.append("\n</svg>\n")
    return "".join(parts)


if __name__ == "__main__":
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("static/img/morton-curve.svg")
    out.write_text(build())
    print(f"wrote {out}")
