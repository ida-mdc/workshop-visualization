#!/usr/bin/env python3
"""The primal/dual figure on the "other ways to place the surface" slide.

Two panels over the *same* scalar field and the same grid, so the only thing
that differs between them is where the algorithm puts a vertex.

Left, primal (marching cubes / marching squares): a vertex on every grid edge
whose two ends straddle the threshold, joined up inside each cell.
Right, dual (surface nets): one vertex per cell that has any crossing at all,
placed at the average of that cell's crossings, joined across the edges.

Both polylines are computed from the field, not drawn by hand, so the vertex
counts printed under the panels are the real ones.

    tools/make-surface-extraction.py [out-file]

Default out-file is static/img/surface-extraction.svg. Re-running overwrites.
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
ROSE = "#e2685f"

N = 8                       # cells per axis
PANEL = 220
GAP = 56
PAD = 14
W = PANEL * 2 + GAP + PAD * 2
H = PANEL + 78

HEAD = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" '
        'font-family="ui-sans-serif, system-ui, sans-serif">\n')
TAIL = "</svg>\n"


def field(x, y):
    """A smooth blob, slightly lobed so the boundary is not a plain circle.

    Positive inside. Smooth on purpose: on a smooth field the two methods
    disagree about vertex *placement* only, which is the thing the figure is
    about. The staircase marching cubes is blamed for comes from running it
    on a binary mask, and that belongs in the text, not in a figure that
    would then be comparing two different inputs.
    """
    dx, dy = x - 0.5, y - 0.52
    r = math.hypot(dx, dy)
    a = math.atan2(dy, dx)
    return 0.30 + 0.055 * math.sin(3 * a + 0.7) - r


def grid_values():
    return [[field(c / N, r / N) for c in range(N + 1)] for r in range(N + 1)]


def crossing(v0, v1):
    """Where along an edge the field hits zero, 0..1 from the first end."""
    if v0 == v1:
        return 0.5
    return max(0.0, min(1.0, v0 / (v0 - v1)))


def edge_points(v):
    """Every crossing on the grid, keyed by the edge it sits on.

    Horizontal edges are ('h', r, c) between (r,c) and (r,c+1); vertical ones
    ('v', r, c) between (r,c) and (r+1,c). Coordinates are in cell units.
    """
    pts = {}
    for r in range(N + 1):
        for c in range(N):
            a, b = v[r][c], v[r][c + 1]
            if (a > 0) != (b > 0):
                pts[("h", r, c)] = (c + crossing(a, b), r)
    for r in range(N):
        for c in range(N + 1):
            a, b = v[r][c], v[r + 1][c]
            if (a > 0) != (b > 0):
                pts[("v", r, c)] = (c, r + crossing(a, b))
    return pts


def cell_edges(r, c):
    return [("h", r, c), ("h", r + 1, c), ("v", r, c), ("v", r, c + 1)]


def primal_segments(pts):
    """Marching squares: join the crossings of each cell, pairwise."""
    segs = []
    for r in range(N):
        for c in range(N):
            here = [pts[k] for k in cell_edges(r, c) if k in pts]
            # Two crossings is the ordinary case; four is the ambiguous one a
            # lookup table has to resolve. Connecting them in order is enough
            # for this field, which has no ambiguous cell.
            for i in range(0, len(here) - 1, 2):
                segs.append((here[i], here[i + 1]))
    return segs


def dual_vertices(pts):
    """Surface nets: one vertex per cell, at the mean of its own crossings."""
    out = {}
    for r in range(N):
        for c in range(N):
            here = [pts[k] for k in cell_edges(r, c) if k in pts]
            if here:
                out[(r, c)] = (sum(p[0] for p in here) / len(here),
                               sum(p[1] for p in here) / len(here))
    return out


def dual_segments(pts, verts):
    """One segment per crossing edge, joining the two cells that share it."""
    segs = []
    for kind, r, c in pts:
        if kind == "h":
            a, b = (r - 1, c), (r, c)
        else:
            a, b = (r, c - 1), (r, c)
        if a in verts and b in verts:
            segs.append((verts[a], verts[b]))
    return segs


def panel(x0, y0, title, subtitle, v, dots, segs, dot_color):
    cell = PANEL / N

    def px(p):
        return x0 + p[0] * cell, y0 + p[1] * cell

    p = [f'<text x="{x0 + PANEL / 2}" y="{y0 - 34}" text-anchor="middle" '
         f'font-size="16" font-weight="600" fill="{DARK}">{title}</text>',
         f'<text x="{x0 + PANEL / 2}" y="{y0 - 15}" text-anchor="middle" '
         f'font-size="12.5" fill="{GREY}">{subtitle}</text>']
    # Grid.
    for i in range(N + 1):
        p.append(f'<line x1="{x0}" y1="{y0 + i * cell:.1f}" x2="{x0 + PANEL}" '
                 f'y2="{y0 + i * cell:.1f}" stroke="{LIGHT}" stroke-width="0.9"/>')
        p.append(f'<line x1="{x0 + i * cell:.1f}" y1="{y0}" '
                 f'x2="{x0 + i * cell:.1f}" y2="{y0 + PANEL}" '
                 f'stroke="{LIGHT}" stroke-width="0.9"/>')
    # Samples: filled where the field is inside, hollow where it is outside.
    for r in range(N + 1):
        for c in range(N + 1):
            cx, cy = x0 + c * cell, y0 + r * cell
            if v[r][c] > 0:
                p.append(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="2.6" fill="{ICE}" '
                         f'stroke="{TEAL}" stroke-width="1.1"/>')
            else:
                p.append(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="1.8" fill="none" '
                         f'stroke="{GREY}" stroke-width="1"/>')
    # The extracted contour.
    for a, b in segs:
        ax, ay = px(a)
        bx, by = px(b)
        p.append(f'<line x1="{ax:.1f}" y1="{ay:.1f}" x2="{bx:.1f}" y2="{by:.1f}" '
                 f'stroke="{BLUE}" stroke-width="2.4" stroke-linecap="round"/>')
    for d in dots:
        cx, cy = px(d)
        p.append(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="3.4" fill="{dot_color}" '
                 f'stroke="#ffffff" stroke-width="1.1"/>')
    p.append(f'<rect x="{x0}" y="{y0}" width="{PANEL}" height="{PANEL}" '
             f'fill="none" stroke="{DARK}" stroke-width="1.4"/>')
    p.append(f'<text x="{x0 + PANEL / 2}" y="{y0 + PANEL + 22}" text-anchor="middle" '
             f'font-size="12.5" fill="{DARK}">{len(dots)} vertices</text>')
    return "".join(p)


def main(out):
    v = grid_values()
    pts = edge_points(v)
    verts = dual_vertices(pts)
    y0 = 46
    svg = [HEAD,
           panel(PAD, y0, "Primal", "a vertex on every crossing edge",
                 v, sorted(pts.values()), primal_segments(pts), ROSE),
           panel(PAD + PANEL + GAP, y0, "Dual", "one vertex per crossing cell",
                 v, sorted(verts.values()), dual_segments(pts, verts), ROSE),
           TAIL]
    Path(out).write_text("".join(svg))
    print(f"{out}: primal {len(pts)} vertices, dual {len(verts)} vertices")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "static/img/surface-extraction.svg")
