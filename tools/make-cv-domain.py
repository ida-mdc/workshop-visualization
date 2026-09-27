#!/usr/bin/env python3
"""The figure for "Borrowing from Computer Vision"'s domain-space TODO.

NeRF and 3D Gaussian Splatting were both built for one job: turning a set of
photographs of a real-world scene into a 3D scene you can view from new
angles. That is the classical domain these methods live in - a solid circle,
drawn full. Scientific 3D data (volumes, point clouds, meshes) is a different
domain, drawn as a dashed circle since these methods were not built for it.
The two slides right after this one exist to answer the "?" in the overlap:
can a representation built for photographs also fit data that never was one.

    tools/make-cv-domain.py [out-file]

Default out-file is static/img/cv-domain.svg. Re-running overwrites.
"""
import sys
from pathlib import Path

DARK = "#232430"
GREY = "#9a9aa4"
BLUE = "#0059a0"
ICE = "#bcd8ea"
TEAL = "#1f7a8c"

W, H = 640, 320
CV_C, CV_R = (250, 165), 155
SCI_C, SCI_R = (420, 165), 155

HEAD = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" '
        'font-family="ui-sans-serif, system-ui, sans-serif">\n')
TAIL = "</svg>\n"


def main(out: Path):
    p = [HEAD]

    p.append(f'<circle cx="{CV_C[0]}" cy="{CV_C[1]}" r="{CV_R}" '
             f'fill="{BLUE}" fill-opacity="0.12" stroke="{BLUE}" stroke-width="2"/>')
    p.append(f'<circle cx="{SCI_C[0]}" cy="{SCI_C[1]}" r="{SCI_R}" '
             f'fill="{TEAL}" fill-opacity="0.10" stroke="{TEAL}" stroke-width="2" '
             f'stroke-dasharray="7 6"/>')

    p.append(f'<text x="{CV_C[0]-90}" y="42" font-size="16" font-weight="700" '
             f'fill="{BLUE}">Computer vision</text>')
    p.append(f'<text x="{CV_C[0]-90}" y="62" font-size="12.5" fill="{DARK}">'
             f'Photographs of a real scene</text>')

    p.append(f'<text x="{SCI_C[0]+10}" y="42" font-size="16" font-weight="700" '
             f'fill="{TEAL}">Scientific 3D data</text>')
    p.append(f'<text x="{SCI_C[0]+10}" y="62" font-size="12.5" fill="{DARK}">'
             f'Volumes, point clouds, meshes</text>')

    p.append(f'<text x="{CV_C[0]-40}" y="{CV_C[1]+5}" font-size="14" '
             f'font-weight="600" fill="{DARK}" text-anchor="middle">NeRF</text>')
    p.append(f'<text x="{CV_C[0]-40}" y="{CV_C[1]+24}" font-size="14" '
             f'font-weight="600" fill="{DARK}" text-anchor="middle">3D Gaussian</text>')
    p.append(f'<text x="{CV_C[0]-40}" y="{CV_C[1]+40}" font-size="14" '
             f'font-weight="600" fill="{DARK}" text-anchor="middle">Splatting</text>')

    overlap_x = (CV_C[0] + SCI_C[0]) / 2 + 10
    p.append(f'<text x="{overlap_x}" y="{CV_C[1]+12}" font-size="30" '
             f'font-weight="700" fill="{GREY}" text-anchor="middle">?</text>')

    p.append(f'<rect x="0" y="0" width="{W}" height="{H}" fill="none"/>')
    p.append(TAIL)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text("".join(p))
    print(f"wrote {out}")


if __name__ == "__main__":
    main(Path(sys.argv[1]) if len(sys.argv) > 1 else Path("static/img/cv-domain.svg"))
