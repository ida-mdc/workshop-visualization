#!/usr/bin/env python3
"""The NeRF and 3D Gaussian Splatting figures, drawn to mirror each other.

Same camera in the same place, same region of the picture for the scene, same
result on the right. Everything that differs between the two panels is the
thing the slides are contrasting:

  NeRF      the box is empty. One ray, a handful of samples along it, and
            thin lines from several of those samples to the *same* little
            network - the scene is that function, queried again and again.
            Its answers are the density-and-color dots, composited into one
            pixel.
  3DGS      the box is full of explicit primitives. Three of them near the
            camera-facing surface project onto an image plane as elliptical
            footprints that overlap and blend. No network anywhere.

One script because the two only work as a pair: the camera glyph, the scale
and the right-hand result are shared code, and a change to one panel that
does not reach the other breaks the comparison.

    tools/make-representation-figures.py [out-dir]

Writes nerf-figure.svg and splat-figure.svg into static/img by default.
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
ROSE = "#e2685f"
PLUM = "#6a4b86"
ACCENT = "#e1462c"

W, H = 940, 400
BOX = (215, 70, 345, 260)          # x, y, w, h of the scene region's front face
DEPTH = (58, -38)                  # how far back the far face sits
CAM = (58, 214)                    # the pinhole
FLOWER = (BOX[0] + BOX[2] * 0.46, BOX[1] + BOX[3] * 0.33)
PIXEL = (858, 214)                 # the one pixel, far right

HEAD = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" '
        'font-family="ui-sans-serif, system-ui, sans-serif">\n')
TAIL = "</svg>\n"


def text(x, y, s, size=14, weight=400, fill=DARK, anchor="middle", style=""):
    return (f'<text x="{x:.1f}" y="{y:.1f}" text-anchor="{anchor}" '
            f'font-size="{size}" font-weight="{weight}" fill="{fill}" '
            f'{style}>{s}</text>')


def camera():
    """The deck's own camera glyph: a wireframe pyramid opening at what it sees."""
    cx, cy = CAM
    far = 74
    half = 34
    corners = [(cx + far, cy - half), (cx + far, cy + half)]
    p = [f'<line x1="{cx}" y1="{cy}" x2="{c[0]}" y2="{c[1]}" stroke="{ACCENT}" '
         f'stroke-width="1.6" stroke-linecap="round"/>' for c in corners]
    p.append(f'<line x1="{cx + far}" y1="{cy - half}" x2="{cx + far}" y2="{cy + half}" '
             f'stroke="{ACCENT}" stroke-width="1.6"/>')
    # A hint of the third dimension, so it reads as a frustum and not a triangle.
    dx, dy = DEPTH[0] * 0.25, DEPTH[1] * 0.25
    p.append(f'<path d="M{cx} {cy} L{cx + far + dx:.0f} {cy - half + dy:.0f} '
             f'L{cx + far + dx:.0f} {cy + half + dy:.0f} Z" fill="none" '
             f'stroke="{ACCENT}" stroke-width="1.1" opacity="0.5"/>')
    p.append(f'<line x1="{cx + far}" y1="{cy - half}" x2="{cx + far + dx:.0f}" '
             f'y2="{cy - half + dy:.0f}" stroke="{ACCENT}" stroke-width="1.1" opacity="0.5"/>')
    p.append(f'<line x1="{cx + far}" y1="{cy + half}" x2="{cx + far + dx:.0f}" '
             f'y2="{cy + half + dy:.0f}" stroke="{ACCENT}" stroke-width="1.1" opacity="0.5"/>')
    p.append(text(cx + 30, cy + half + 42, "camera", 13, 500, GREY))
    return "".join(p)


def scene_box(opacity=0.55, label=None):
    """The bounding box, as a faint parallelepiped."""
    x, y, w, h = BOX
    dx, dy = DEPTH
    front = [(x, y), (x + w, y), (x + w, y + h), (x, y + h)]
    back = [(px + dx, py + dy) for px, py in front]
    p = []
    poly = lambda pts: " ".join(f"{a:.0f},{b:.0f}" for a, b in pts)
    p.append(f'<polygon points="{poly(back)}" fill="none" stroke="{LIGHT}" '
             f'stroke-width="1.2" opacity="{opacity}"/>')
    for a, b in zip(front, back):
        p.append(f'<line x1="{a[0]}" y1="{a[1]}" x2="{b[0]:.0f}" y2="{b[1]:.0f}" '
                 f'stroke="{LIGHT}" stroke-width="1.2" opacity="{opacity}"/>')
    p.append(f'<polygon points="{poly(front)}" fill="none" stroke="{GREY}" '
             f'stroke-width="1.4" opacity="{opacity + 0.2:.2f}"/>')
    if label:
        p.append(text(x + w / 2 + dx / 2, y + dy - 14, label, 14, 600, GREY))
    return "".join(p)


def result_pixel(color, caption):
    """The one pixel the whole panel is about, on the far right."""
    px, py = PIXEL
    s = 34
    return "".join([
        f'<rect x="{px - s / 2}" y="{py - s / 2}" width="{s}" height="{s}" '
        f'fill="{color}" stroke="{DARK}" stroke-width="1.4"/>',
        text(px, py + s / 2 + 22, caption, 13, 500, GREY),
    ])


# ------------------------------------------------------------------ NeRF panel

def ray_samples(n=9):
    """The one ray, and the samples on it - which have to lie *on* it.

    The ray is fixed by the pinhole and where it leaves the picture; the
    samples are the part of it inside the box, because outside the box there
    is nothing to query.
    """
    ax, ay = CAM
    bx, by = BOX[0] + BOX[2] + 44, 292          # where the ray leaves the picture
    enter = (BOX[0] + 20 - ax) / (bx - ax)
    leave = (BOX[0] + BOX[2] - 14 - ax) / (bx - ax)
    out = []
    for i in range(n):
        u = (i + 0.5) / n
        t = enter + (leave - enter) * u
        # Two bumps: the ray crosses empty air, then something solid, then air.
        d = (math.exp(-((u - 0.38) ** 2) / 0.006)
             + 0.55 * math.exp(-((u - 0.63) ** 2) / 0.010))
        out.append((ax + (bx - ax) * t, ay + (by - ay) * t, min(1.0, d)))
    return (ax, ay), (bx, by), out


def nerf():
    start, end, samples = ray_samples()
    net = (688, 128)
    p = [HEAD, camera(),
         scene_box(label="scene lives in the network weights")]

    # The one ray.
    p.append(f'<line x1="{start[0]:.0f}" y1="{start[1]:.0f}" x2="{end[0]:.0f}" '
             f'y2="{end[1]:.0f}" stroke="{DARK}" stroke-width="1.6"/>')

    # Thin lines from four of the samples to the same network.
    for i in (1, 3, 5, 7):
        sx, sy, _ = samples[i]
        p.append(f'<line x1="{sx:.0f}" y1="{sy:.0f}" x2="{net[0]:.0f}" y2="{net[1] + 26:.0f}" '
                 f'stroke="{PLUM}" stroke-width="0.8" opacity="0.5"/>')

    for sx, sy, _ in samples:
        p.append(f'<circle cx="{sx:.1f}" cy="{sy:.1f}" r="4" fill="#ffffff" '
                 f'stroke="{DARK}" stroke-width="1.4"/>')

    # The network: one small box, queried by all of them.
    nx, ny = net
    p.append(f'<rect x="{nx - 40}" y="{ny - 26}" width="80" height="52" rx="8" '
             f'fill="#ffffff" stroke="{PLUM}" stroke-width="1.8"/>')
    for i, cx in enumerate((nx - 22, nx, nx + 22)):
        for cy in (ny - 12, ny, ny + 12):
            p.append(f'<circle cx="{cx}" cy="{cy}" r="2.6" fill="{PLUM}" opacity="0.75"/>')
        if i < 2:
            for a in (ny - 12, ny, ny + 12):
                for b in (ny - 12, ny, ny + 12):
                    p.append(f'<line x1="{cx + 2.6}" y1="{a}" x2="{cx + 22 - 2.6}" y2="{b}" '
                             f'stroke="{PLUM}" stroke-width="0.4" opacity="0.35"/>')
    p.append(text(nx, ny - 36, "F&#952;", 16, 700, PLUM))
    p.append(text(nx, ny + 48, "position, direction", 12, 400, GREY))
    p.append(text(nx, ny + 63, "&#8594; density, color", 12, 400, GREY))

    # What it answers: one dot per sample, opacity = density.
    col_x = 790
    top = 118
    step = 21
    for i, (_, _, d) in enumerate(samples):
        y = top + i * step
        p.append(f'<circle cx="{col_x}" cy="{y}" r="6" fill="{TEAL}" '
                 f'fill-opacity="{max(0.06, d):.2f}" stroke="{TEAL}" '
                 f'stroke-width="0.7" stroke-opacity="0.45"/>')
    p.append(text(col_x, top - 22, "what it answers", 13, 600, TEAL))
    p.append(f'<line x1="{col_x + 14}" y1="{PIXEL[1]}" x2="{PIXEL[0] - 28}" '
             f'y2="{PIXEL[1]}" stroke="{GREY}" stroke-width="1" opacity="0.6" '
             f'marker-end="url(#a)"/>')
    p.append('<defs><marker id="a" markerWidth="8" markerHeight="8" refX="6" refY="3" '
             f'orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="{GREY}"/></marker></defs>')
    p.append(result_pixel("#3f7f87", "one pixel"))
    p.append(TAIL)
    return "".join(p)


# ------------------------------------------------------------------ 3DGS panel

def flower_gaussians():
    """A flower, as elongated ellipsoids: petals radiating off a round centre.

    Deterministic, and few enough to draw every one of them - the slide says
    "imply many more", and a handful of half-opacity extras behind the
    silhouette does that better than a field of noise.
    """
    cx, cy = FLOWER
    out = []
    for ring, (count, radius, length, width, color, op) in enumerate([
        (12, 66, 36, 15, AMBER, 0.55),
        (10, 41, 27, 13, "#f6d29a", 0.6),
    ]):
        for i in range(count):
            a = (i + 0.5 * ring) / count * math.tau
            out.append((cx + math.cos(a) * radius, cy + math.sin(a) * radius,
                        length, width, math.degrees(a), color, op))
    for i in range(7):
        a = i / 7 * math.tau
        out.append((cx + math.cos(a) * 15, cy + math.sin(a) * 15, 16, 14,
                    0, "#a8722a", 0.6))
    # A stem and two leaves, so it is an object rather than a rosette. Kept
    # short enough to stay inside the bounding box - a primitive hanging out
    # of the box would be the one thing in the figure that is not true.
    for i in range(4):
        out.append((cx - 3 - i, cy + 92 + i * 17, 22, 8, 84, TEAL, 0.5))
    out.append((cx - 24, cy + 122, 30, 12, 24, TEAL, 0.45))
    out.append((cx + 19, cy + 143, 28, 11, -20, TEAL, 0.45))
    return out


def splat():
    gs = flower_gaussians()
    p = [HEAD, camera(), scene_box(label="scene = explicit primitives")]

    # Every primitive, then the three that get followed through.
    picked = [g for g in gs if g[0] < BOX[0] + BOX[2] * 0.5][:0]
    for x, y, l, w, rot, color, op in gs:
        p.append(f'<ellipse cx="{x:.1f}" cy="{y:.1f}" rx="{l / 2:.1f}" ry="{w / 2:.1f}" '
                 f'transform="rotate({rot:.1f} {x:.1f} {y:.1f})" fill="{color}" '
                 f'fill-opacity="{op:.2f}"/>')

    # Three near the camera-facing surface: left side of the flower head.
    cx, cy = FLOWER
    three = []
    for a_deg, r in ((195, 66), (225, 66), (210, 41)):
        a = math.radians(a_deg)
        three.append((cx + math.cos(a) * r, cy + math.sin(a) * r,
                      36 if r > 50 else 27, 15 if r > 50 else 13, a_deg))
    for x, y, l, w, rot in three:
        p.append(f'<ellipse cx="{x:.1f}" cy="{y:.1f}" rx="{l / 2:.1f}" ry="{w / 2:.1f}" '
                 f'transform="rotate({rot:.1f} {x:.1f} {y:.1f})" fill="none" '
                 f'stroke="{ACCENT}" stroke-width="1.8"/>')

    # The image plane, and the footprints the three land on.
    plane = (640, 96, 96, 240)
    px, py, pw, ph = plane
    dx, dy = 40, -26
    p.append(f'<polygon points="{px},{py} {px + dx},{py + dy} '
             f'{px + dx},{py + dy + ph} {px},{py + ph}" fill="#ffffff" '
             f'stroke="{GREY}" stroke-width="1.3"/>')
    p.append(text(px + dx / 2 + 6, py + dy - 12, "image plane", 13, 500, GREY))

    # Close enough together that the footprints actually overlap - the
    # overlap is the alpha blending, and three tidy separate ellipses
    # would be showing the opposite of the point.
    targets = [(px + 24, py + 70), (px + 18, py + 96), (px + 30, py + 83)]
    for (sx, sy, l, w, rot), (tx, ty) in zip(three, targets):
        p.append(f'<line x1="{sx:.0f}" y1="{sy:.0f}" x2="{tx}" y2="{ty}" '
                 f'stroke="{ACCENT}" stroke-width="0.9" stroke-dasharray="4 4" '
                 f'opacity="0.75"/>')
    for (tx, ty), (l, w, rot, op) in zip(
            targets, ((46, 23, 20, 0.5), (42, 21, -16, 0.42), (34, 19, 4, 0.6))):
        p.append(f'<ellipse cx="{tx}" cy="{ty}" rx="{l / 2}" ry="{w / 2}" '
                 f'transform="rotate({rot} {tx} {ty})" fill="{AMBER}" fill-opacity="{op}" '
                 f'stroke="{ACCENT}" stroke-width="1.1" stroke-opacity="0.8"/>')
    p.append(text(px + 26, py + ph + 24, "sorted, alpha-blended", 12, 400, GREY))

    p.append(f'<line x1="{px + pw - 6}" y1="{PIXEL[1]}" x2="{PIXEL[0] - 28}" '
             f'y2="{PIXEL[1]}" stroke="{GREY}" stroke-width="1" opacity="0.6" '
             f'marker-end="url(#a)"/>')
    p.append('<defs><marker id="a" markerWidth="8" markerHeight="8" refX="6" refY="3" '
             f'orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="{GREY}"/></marker></defs>')
    p.append(result_pixel("#e8b95f", "the image"))
    p.append(TAIL)
    return "".join(p)


def main(out_dir: Path):
    (out_dir / "nerf-figure.svg").write_text(nerf())
    (out_dir / "splat-figure.svg").write_text(splat())
    print(f"wrote {out_dir}/nerf-figure.svg and {out_dir}/splat-figure.svg")


if __name__ == "__main__":
    main(Path(sys.argv[1]) if len(sys.argv) > 1 else Path("static/img"))
