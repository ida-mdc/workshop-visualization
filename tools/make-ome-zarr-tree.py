#!/usr/bin/env python3
"""The figure for "Structuring Volumes"'s OME-Zarr tree TODO.

A compact file tree for a real OME-Zarr dataset: the group-level metadata
that makes it self-describing (.zattrs' multiscales entry), one subgroup per
resolution level, and inside each level the chunk files that let a reader
fetch a single piece instead of the whole array. Three things this section
argues for - metadata, resolution levels, chunks - drawn as the actual
folder structure that holds them, not a schematic.

    tools/make-ome-zarr-tree.py [out-file]

Default out-file is static/img/ome-zarr-tree.svg. Re-running overwrites.
"""
import sys
from pathlib import Path

DARK = "#232430"
GREY = "#9a9aa4"
BLUE = "#0059a0"
TEAL = "#1f7a8c"
AMBER = "#e2a13c"

LINE_H = 24
PAD = 16
FONT = 15.5
W = 560

HEAD = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" '
        'font-family="ui-monospace, SFMono-Regular, Menlo, monospace">\n')
TAIL = "</svg>\n"

# (tree text, annotation, annotation color) - annotation is None to omit.
ROWS = [
    ("sample.ome.zarr/", None, None),
    ("├── .zattrs", "multiscales metadata: axes, levels, transforms", BLUE),
    ("├── .zgroup", None, None),
    ("├── 0/", "full resolution", TEAL),
    ("│   ├── .zarray", "shape, dtype, chunk shape", None),
    ("│   └── 0.0.0, 0.0.1, 0.0.2, …", "one file per chunk", AMBER),
    ("├── 1/", "half resolution", TEAL),
    ("│   └── … same layout, fewer chunks", None, None),
    ("└── 2/", "quarter resolution", TEAL),
    ("    └── … same layout, fewer still", None, None),
]


def main(out: Path):
    h = PAD * 2 + LINE_H * len(ROWS)
    p = [HEAD.format(w=W, h=h)]
    p.append(f'<rect x="0" y="0" width="{W}" height="{h}" fill="#fbfbfd" '
             f'stroke="{GREY}" stroke-width="1" rx="6"/>')
    for i, (text, note, color) in enumerate(ROWS):
        y = PAD + LINE_H * i + 16
        weight = "700" if text.rstrip().endswith("/") else "400"
        p.append(f'<text x="{PAD}" y="{y}" font-size="{FONT}" fill="{DARK}" '
                  f'font-weight="{weight}" xml:space="preserve">{text}</text>')
        if note:
            p.append(f'<text x="{W - PAD}" y="{y}" font-size="12.5" fill="{color or GREY}" '
                      f'text-anchor="end" font-family="ui-sans-serif, system-ui, sans-serif">'
                      f'{note}</text>')
    p.append(TAIL)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text("".join(p))
    print(f"wrote {out}")


if __name__ == "__main__":
    main(Path(sys.argv[1]) if len(sys.argv) > 1 else Path("static/img/ome-zarr-tree.svg"))
