#!/usr/bin/env python3
"""Draw the transfer function figure for the voxels session.

    tools/make-transfer-figure.py [output-path]

Three panels: an array of voxel values, the lookup that is applied to it, and
what comes out. The middle panel is the same thing the volume shader samples -
a 256-entry table whose RGB is the color band and whose A is the curve above
it - so the figure is a picture of the actual mechanism and not a metaphor for
it.

Deliberately NOT a picture of a ray crossing a volume. That is the slide
before this one, drawn properly and in three dimensions; repeating it here
spent a third of the figure re-explaining something the room had already seen
and left no room for the part this slide is about.

The numbers matter. Two cells hold 209, which is brighter than anything else
in the array and comes out completely invisible, because the curve is back at
zero by then. A transfer function that could only ever show "more" or "less"
would be a contrast slider; being able to hide the brightest thing in the
volume is what makes it worth a slide of its own.

The result is committed, so the site build does not depend on Python.
"""
import pathlib
import sys

OUT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1
                   else "static/icons/transfer-function.svg")

FONT = "Urbanist, Helvetica, sans-serif"
INK = "#232430"
MUTED = "#9a9aa4"
HOT = "#e1462c"
TEAL = "#1f7a8c"
PAPER = "#fbfbfd"
LINE = "#c9cdd6"

# Magma, and the same stops the "window on the brain" example uses on the next
# slide - so the figure and the volume it is about are the same lookup.
STOPS = ["#14061c", "#5b1f6b", "#c0407a", "#f9a86a", "#fff3c4"]

# A band that opens above the background and closes again below the brightest
# values. Anchor points, not a rising shoulder: coming back down is the whole
# reason the panel on the right looks the way it does.
POINTS = [(0.00, 0.0), (0.30, 0.0), (0.40, 0.62),
          (0.52, 1.0), (0.62, 0.32), (0.70, 0.0), (1.00, 0.0)]

# How opaque the peak of that curve actually is. The curve is drawn against
# its own maximum, the way a transfer function editor draws it; this is what
# that maximum means.
PEAK_ALPHA = 0.92

# One 5 x 5 corner of a volume, as 8-bit values. Background around the edges,
# a structure through the middle, and two voxels at 209 that the curve throws
# away.
VALUES = [
    [12, 20, 31, 26, 15],
    [18, 89, 209, 102, 28],
    [23, 117, 140, 133, 97],
    [16, 107, 128, 209, 30],
    [10, 23, 38, 26, 13],
]

CELL = 42
GRID_Y = 66
IN_X = 60
OUT_X = 900

BOX_L, BOX_R = 348, 818
BOX_T, BOX_B = 60, 196
BAND_T, BAND_H = 208, 24


def ramp(t):
    """The color map, interpolated the way runtime.js interpolates it."""
    t = min(1.0, max(0.0, t))
    span = len(STOPS) - 1
    i = min(int(t * span), span - 1)
    f = t * span - i
    a = STOPS[i].lstrip("#")
    b = STOPS[i + 1].lstrip("#")
    return tuple(
        round(int(a[k:k + 2], 16) + (int(b[k:k + 2], 16)
                                     - int(a[k:k + 2], 16)) * f)
        for k in (0, 2, 4)
    )


def alpha(t):
    """The opacity curve: linear between the anchor points, as VTK does it."""
    if t <= POINTS[0][0]:
        return POINTS[0][1]
    for i in range(1, len(POINTS)):
        x1, y1 = POINTS[i]
        if t <= x1:
            x0, y0 = POINTS[i - 1]
            f = 1.0 if x1 == x0 else (t - x0) / (x1 - x0)
            return y0 + (y1 - y0) * f
    return POINTS[-1][1]


# Type sizes, in viewBox units. The figure is drawn 1180 wide and lands on a
# 1920 slide at about two thirds of it, so a label set at 13 here arrives at
# roughly 13 real pixels next to 40-pixel body text - which is what "the text
# is too small in slide mode" means. These are the sizes that read from the
# back of a room; the figure is a diagram, not a footnote.
BIG = 22      # panel headings
MID = 19      # in-figure annotations
SMALL = 17    # axis ends


def text(x, y, s, size=MID, fill=INK, weight=600, anchor="start"):
    return (f'<text x="{x}" y="{y}" font-family="{FONT}" font-size="{size}" '
            f'text-anchor="{anchor}" fill="{fill}" font-weight="{weight}">'
            f'{s}</text>')


def arrow(x, y, length=40):
    return (f'<path d="M{x},{y} L{x + length - 10},{y}" stroke="{MUTED}" '
            f'stroke-width="2"/>'
            f'<path d="M{x + length - 12},{y - 6} L{x + length},{y} '
            f'L{x + length - 12},{y + 6} Z" fill="{MUTED}"/>')


def grid(x0, cells, outline, checker=False):
    """One 5 x 5 array of cells. `cells` gives (fill, label, alpha) per cell."""
    out = []
    for r, row in enumerate(cells):
        for c, (fill, label, a) in enumerate(row):
            x = x0 + c * CELL
            y = GRID_Y + r * CELL
            if checker:
                # The transparency checkerboard every image editor uses. The
                # alternative - flattening the color onto the page - keeps
                # the alpha honest but washes every hue out to a pastel, and
                # then the panel no longer looks like the color map it came
                # from. Against a checker the color stays the color and the
                # opacity is what you see through it.
                out.append(f'<rect x="{x}" y="{y}" width="{CELL}" '
                           f'height="{CELL}" fill="url(#checker)"/>')
            out.append(f'<rect x="{x}" y="{y}" width="{CELL}" height="{CELL}" '
                       f'fill="{fill}" fill-opacity="{a:.3f}" '
                       f'stroke="{outline}" stroke-width="1"/>')
            if label is not None:
                # Dark cells need light type and light cells need dark; the
                # threshold is where the fill stops being legible under black.
                rgb = tuple(int(fill.lstrip("#")[k:k + 2], 16)
                            for k in (0, 2, 4))
                lum = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255
                out.append(text(x + CELL / 2, y + CELL / 2 + 5, label,
                                size=15, weight=500, anchor="middle",
                                fill=INK if lum > 0.55 else "#ffffff"))
    return out


def main():
    # width and height as well as the viewBox, and they are not decoration.
    # Without them the file has no intrinsic size, and the figure shortcode
    # asks for `width: auto; height: auto; max-width: 100%; max-height: 36vh`.
    # On the scrolling page the column supplies a definite width and that
    # resolves; on a slide, which is a flex column sized to its content, there
    # is nothing to resolve against and the image lays out at 0 x 0 - so the
    # figure is simply absent from the deck, with no broken-image mark to say
    # so. An intrinsic size gives the max-height something to scale.
    svg = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1180 330" '
           f'width="1180" height="330" fill="none">',
           '<defs><pattern id="checker" width="20" height="20" '
           'patternUnits="userSpaceOnUse">'
           '<rect width="20" height="20" fill="#ffffff"/>'
           '<rect width="10" height="10" fill="#e6e8ee"/>'
           '<rect x="10" y="10" width="10" height="10" fill="#e6e8ee"/>'
           '</pattern></defs>']

    # ---------------------------------------------------------------- in
    svg += grid(IN_X, [[(f"#{v:02x}{v:02x}{v:02x}", str(v), 1.0) for v in row]
                       for row in VALUES], LINE)
    svg.append(text(IN_X, 44, "an array of voxel values", size=BIG))
    svg.append(text(IN_X, GRID_Y + 5 * CELL + 26, "one number each, 0 to 255",
                    size=SMALL, fill=MUTED, weight=400))
    svg.append(arrow(IN_X + 5 * CELL + 18, GRID_Y + 2.5 * CELL))

    # ------------------------------------------------------------ lookup
    svg.append(f'<rect x="{BOX_L}" y="{BOX_T}" width="{BOX_R - BOX_L}" '
               f'height="{BOX_B - BOX_T}" fill="{PAPER}" stroke="{MUTED}" '
               f'stroke-width="1"/>')

    def px(t):
        return BOX_L + t * (BOX_R - BOX_L)

    def py(a):
        return BOX_B - a * (BOX_B - BOX_T)

    curve = " ".join(f"{'M' if i == 0 else 'L'}{px(t):.1f},{py(a):.1f}"
                     for i, (t, a) in enumerate(POINTS))
    svg.append(f'<path d="{curve} L{BOX_R},{BOX_B} L{BOX_L},{BOX_B} Z" '
               f'fill="{TEAL}" fill-opacity="0.16"/>')
    svg.append(f'<path d="{curve}" fill="none" stroke="{TEAL}" '
               f'stroke-width="2.4" stroke-linejoin="round"/>')
    for t, a in POINTS:
        svg.append(f'<circle cx="{px(t):.1f}" cy="{py(a):.1f}" r="4.5" '
                   f'fill="{HOT}" stroke="#fff" stroke-width="1.5"/>')

    steps = 128
    width = (BOX_R - BOX_L) / steps
    for i in range(steps):
        r, g, b = ramp(i / (steps - 1))
        svg.append(f'<rect x="{BOX_L + i * width:.2f}" y="{BAND_T}" '
                   f'width="{width + 0.6:.2f}" height="{BAND_H}" '
                   f'fill="rgb({r},{g},{b})"/>')
    svg.append(f'<rect x="{BOX_L}" y="{BAND_T}" width="{BOX_R - BOX_L}" '
               f'height="{BAND_H}" fill="none" stroke="{MUTED}" '
               f'stroke-width="1"/>')

    svg.append(text(BOX_L, 44, "opacity", size=BIG, fill=TEAL))
    svg.append(text(BOX_R, 44, "anchor points you drag", size=MID, fill=HOT,
                    anchor="end"))
    svg.append(text(BOX_L - 12, BAND_T + 17, "color", size=BIG,
                    anchor="end"))
    svg.append(text(BOX_L, BAND_T + BAND_H + 24, "voxel value  0", size=SMALL,
                    fill=MUTED, weight=400))
    svg.append(text(BOX_R, BAND_T + BAND_H + 24, "255", size=SMALL, fill=MUTED,
                    weight=400, anchor="end"))
    svg.append(text((BOX_L + BOX_R) / 2, BAND_T + BAND_H + 52,
                    "one 256-entry table: RGB along the band, A along the "
                    "curve", size=SMALL, fill=INK, weight=400,
                    anchor="middle"))
    svg.append(arrow(BOX_R + 18, GRID_Y + 2.5 * CELL))

    # --------------------------------------------------------------- out
    out_cells = []
    for row in VALUES:
        line = []
        for v in row:
            r, g, b = ramp(v / 255)
            line.append((f"#{r:02x}{g:02x}{b:02x}", None,
                         alpha(v / 255) * PEAK_ALPHA))
        out_cells.append(line)
    # Every cell keeps its outline, including the ones that came out empty:
    # they still have to be countable, or the reader cannot tell which voxels
    # the curve threw away.
    svg += grid(OUT_X, out_cells, LINE, checker=True)
    svg.append(text(OUT_X, 44, "color and opacity out", size=BIG))
    svg.append(text(OUT_X, GRID_Y + 5 * CELL + 26,
                    "the two brightest voxels are gone", size=SMALL,
                    fill=HOT, weight=600))

    svg.append("</svg>")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text("\n".join(svg) + "\n")
    print(f"{OUT}: {OUT.stat().st_size / 1000:.1f} kB")


if __name__ == "__main__":
    main()
