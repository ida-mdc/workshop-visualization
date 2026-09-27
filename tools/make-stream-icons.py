#!/usr/bin/env python3
"""Icons for the streaming section's two schemas.

Written the same way as static/icons/pipeline/: a 48x48 viewBox, flat shapes,
no strokes finer than 0.6, and the deck's palette. Mermaid draws these at 68
pixels, so anything thinner than a hairline disappears on a projector.

The first five (metadata, pick-chunks, http-get, gpu-upload, sharpen) are the
original "how a browser opens a terabyte" schema - a browser's-eye view of
its own request loop. convert, host, share-link and open-link are for a
second schema next to it, told from the other side: what the person with the
data actually does (convert once, host it, send a link), and what the person
who opens that link actually sees (a link, then something immediately,
then it sharpens - reusing the "sharpen" icon above for that last step).

laptop, solo and anyone are for a third schema: the same static host
(the "host" icon above) reached three different ways - from your own
machine only, from a real address anyone can reach, or by a link that
carries the address for them.

    tools/make-stream-icons.py [out-dir]

Default out-dir is static/icons/stream/. Re-running overwrites.
"""
import sys
from pathlib import Path

# The deck's palette, same names as static/js/viz/runtime.js.
DARK = "#232430"
GREY = "#9a9aa4"
LIGHT = "#dcdce4"
BLUE = "#0059a0"
ICE = "#bcd8ea"
ACCENT = "#e1462c"
AMBER = "#e2a13c"
TEAL = "#1f7a8c"

HEAD = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none"'
        ' stroke-linejoin="round" stroke-linecap="round">\n  ')
TAIL = "\n</svg>\n"


def metadata():
    """A file card with a chunk grid and a size written on it."""
    p = [f'<path d="M11,5 H30 L37,12 V43 H11 Z" fill="#ffffff" stroke="{DARK}" stroke-width="1.6"/>',
         f'<path d="M30,5 V12 H37" fill="none" stroke="{DARK}" stroke-width="1.6"/>']
    # The three facts a viewer reads out of it: axes, levels, chunk grid.
    for i, y in enumerate((18, 22.5, 27)):
        w = (16, 12, 14)[i]
        p.append(f'<rect x="15" y="{y}" width="{w}" height="2.2" rx="1.1" fill="{GREY}"/>')
    # A 3x3 chunk grid at the bottom, one cell filled: the layout it describes.
    for r in range(3):
        for c in range(3):
            fill = BLUE if (r, c) == (1, 1) else ICE
            p.append(f'<rect x="{15 + c * 6}" y="{32 + r * 3.2}" width="5" height="2.6" '
                     f'fill="{fill}"/>')
    return "".join(p)


def pick_chunks():
    """A chunk grid with the camera's footprint over it."""
    p = []
    for r in range(6):
        for c in range(6):
            inside = 1 <= r <= 3 and 2 <= c <= 4
            fill = BLUE if inside else "#ffffff"
            p.append(f'<rect x="{5 + c * 6.3}" y="{5 + r * 6.3}" width="6.3" height="6.3" '
                     f'fill="{fill}" stroke="{GREY}" stroke-width="0.6"/>')
    # The view rectangle: what is on screen, drawn over the grid it lands on.
    p.append(f'<rect x="16.6" y="10.4" width="19.5" height="19.5" fill="none" '
             f'stroke="{ACCENT}" stroke-width="2.2"/>')
    return "".join(p)


def http_get():
    """A static host, three requests leaving it, and the blocks coming back."""
    p = [f'<rect x="4" y="7" width="13" height="34" rx="2" fill="{LIGHT}" '
         f'stroke="{DARK}" stroke-width="1.5"/>']
    for y in (12, 22, 32):
        p.append(f'<rect x="7" y="{y}" width="7" height="5" fill="#ffffff" '
                 f'stroke="{GREY}" stroke-width="0.7"/>')
    # One arrow per request, and the block it returns.
    for y in (13.5, 24, 34.5):
        p.append(f'<path d="M19,{y} H35" stroke="{TEAL}" stroke-width="1.8"/>')
        p.append(f'<path d="M34,{y - 2.6} L39,{y} L34,{y + 2.6} Z" fill="{TEAL}"/>')
        p.append(f'<rect x="40" y="{y - 3.2}" width="6.4" height="6.4" fill="{BLUE}"/>')
    return "".join(p)


def gpu_upload():
    """A block going into graphics memory."""
    p = [f'<rect x="12" y="16" width="28" height="26" rx="2" fill="{LIGHT}" '
         f'stroke="{DARK}" stroke-width="1.6"/>']
    # Pins, so it reads as a chip and not as another box.
    for i in range(4):
        x = 16 + i * 6.6
        p.append(f'<path d="M{x},42 V46" stroke="{DARK}" stroke-width="1.5"/>')
        p.append(f'<path d="M8,{21 + i * 6} H12" stroke="{DARK}" stroke-width="1.5"/>')
    # The resident blocks, and the one arriving.
    for r in range(2):
        for c in range(3):
            p.append(f'<rect x="{16 + c * 7.2}" y="{25 + r * 7.2}" width="6.2" height="6.2" '
                     f'fill="{BLUE}" fill-opacity="{0.35 if (r + c) % 2 else 0.85}"/>')
    p.append(f'<rect x="20.8" y="2" width="6.4" height="6.4" fill="{BLUE}"/>')
    p.append(f'<path d="M24,9 V14" stroke="{TEAL}" stroke-width="1.8"/>')
    p.append(f'<path d="M21.2,13 L24,17.5 L26.8,13 Z" fill="{TEAL}"/>')
    return "".join(p)


def sharpen():
    """A viewport, coarse on the left and fine on the right."""
    p = [f'<rect x="4" y="9" width="40" height="30" rx="2" fill="#ffffff" '
         f'stroke="{DARK}" stroke-width="1.6"/>']
    # Coarse half: four big cells. Fine half: the same area at 4x.
    for r in range(2):
        for c in range(2):
            v = 0.25 + 0.2 * (r * 2 + c)
            p.append(f'<rect x="{5.5 + c * 9}" y="{10.5 + r * 13.5}" width="9" height="13.5" '
                     f'fill="{BLUE}" fill-opacity="{v:.2f}"/>')
    for r in range(8):
        for c in range(8):
            v = 0.18 + 0.09 * ((r * 3 + c * 5) % 9)
            p.append(f'<rect x="{23.5 + c * 2.4}" y="{10.5 + r * 3.4}" width="2.4" height="3.4" '
                     f'fill="{BLUE}" fill-opacity="{v:.2f}"/>')
    p.append(f'<path d="M23.5,10.5 V37.5" stroke="{AMBER}" stroke-width="1.6"/>')
    return "".join(p)


def convert():
    """One flat file becoming a resolution pyramid - the one-time conversion."""
    p = [f'<path d="M4,6 H16 L20,10 V42 H4 Z" fill="{LIGHT}" stroke="{DARK}" stroke-width="1.5"/>',
         f'<path d="M16,6 V10 H20" fill="none" stroke="{DARK}" stroke-width="1.5"/>']
    for y in (18, 23, 28, 33):
        p.append(f'<rect x="7" y="{y}" width="10" height="2" rx="1" fill="{GREY}"/>')
    p.append(f'<path d="M23,24 H30" stroke="{TEAL}" stroke-width="1.8"/>')
    p.append(f'<path d="M29,21.4 L34,24 L29,26.6 Z" fill="{TEAL}"/>')
    # The pyramid it becomes: one coarse cell, four fine ones below it.
    p.append(f'<rect x="36" y="8" width="10" height="10" fill="{BLUE}"/>')
    for r in range(2):
        for c in range(2):
            p.append(f'<rect x="{35.5 + c * 5.5}" y="{22 + r * 5.5}" width="5" height="5" '
                     f'fill="{BLUE}" fill-opacity="{0.45 + 0.25 * ((r + c) % 2)}"/>')
    return "".join(p)


def host():
    """A plain server holding the chunks - nothing custom, just a static host."""
    p = [f'<rect x="8" y="4" width="32" height="40" rx="2" fill="{LIGHT}" '
         f'stroke="{DARK}" stroke-width="1.6"/>']
    for i in range(4):
        y = 9 + i * 5
        p.append(f'<path d="M12,{y} H24" stroke="{DARK}" stroke-width="1.3"/>')
        p.append(f'<circle cx="34" cy="{y}" r="1.3" fill="{TEAL}"/>')
    for r in range(2):
        for c in range(3):
            p.append(f'<rect x="{11.5 + c * 6.2}" y="{31 + r * 6.2}" width="5.4" height="5.4" '
                     f'fill="{BLUE}" fill-opacity="{0.5 + 0.2 * ((r + c) % 2)}"/>')
    return "".join(p)


def share_link():
    """An envelope with a link chain on it - sending someone a URL, not a file."""
    p = [f'<path d="M4,12 H44 V38 H4 Z" fill="{LIGHT}" stroke="{DARK}" stroke-width="1.6"/>',
         f'<path d="M4,12 L24,28 L44,12" fill="none" stroke="{DARK}" stroke-width="1.6"/>']
    # Two interlocked, tilted rings - a chain link, not a "no entry" sign.
    p.append(f'<g transform="rotate(-30 24 30)">'
             f'<rect x="15" y="27" width="10" height="6" rx="3" fill="none" '
             f'stroke="{TEAL}" stroke-width="2.4"/>'
             f'<rect x="23" y="27" width="10" height="6" rx="3" fill="none" '
             f'stroke="{TEAL}" stroke-width="2.4"/></g>')
    return "".join(p)


def open_link():
    """A browser chrome with a link in the address bar, and a cursor landing on it."""
    p = [f'<rect x="4" y="8" width="40" height="32" rx="2" fill="#ffffff" '
         f'stroke="{DARK}" stroke-width="1.6"/>',
         f'<path d="M4,16 H44" stroke="{DARK}" stroke-width="1.3"/>']
    for cx in (9, 13, 17):
        p.append(f'<circle cx="{cx}" cy="12" r="1.3" fill="{GREY}"/>')
    p.append(f'<rect x="21" y="10" width="19" height="4.4" rx="2.2" fill="{ICE}"/>')
    p.append(f'<circle cx="26" cy="12.2" r="2.1" fill="none" stroke="{BLUE}" stroke-width="1.3"/>')
    p.append(f'<circle cx="29.3" cy="12.2" r="2.1" fill="none" stroke="{BLUE}" stroke-width="1.3"/>')
    # The cursor, arriving.
    p.append(f'<path d="M32,26 L32,40 L35.4,36.6 L38,42 L40,41 L37.4,35.6 L42,35 Z" '
             f'fill="{DARK}"/>')
    return "".join(p)


def first_view():
    """A viewport with only the coarse level in it - what shows up first."""
    p = [f'<rect x="4" y="9" width="40" height="30" rx="2" fill="#ffffff" '
         f'stroke="{DARK}" stroke-width="1.6"/>']
    for r in range(2):
        for c in range(2):
            v = 0.3 + 0.22 * (r * 2 + c)
            p.append(f'<rect x="{5.5 + c * 19}" y="{10.5 + r * 13.5}" width="19" height="13.5" '
                     f'fill="{BLUE}" fill-opacity="{v:.2f}"/>')
    return "".join(p)


def laptop():
    """A laptop, serving its own screen - the data never leaves the machine."""
    p = [f'<path d="M6,10 H42 V32 H6 Z" fill="{LIGHT}" stroke="{DARK}" stroke-width="1.6"/>',
         f'<path d="M2,38 H46 L42,32 H6 Z" fill="{LIGHT}" stroke="{DARK}" stroke-width="1.6"/>']
    for r in range(2):
        for c in range(2):
            p.append(f'<rect x="{15 + c * 9.5}" y="{15 + r * 7.5}" width="8" height="6.4" '
                     f'fill="{BLUE}" fill-opacity="{0.5 + 0.25 * ((r + c) % 2)}"/>')
    # A short loop arrow, back onto the same screen - serving only itself.
    p.append(f'<path d="M32,17 A6,6 0 1 1 30,13" fill="none" stroke="{TEAL}" stroke-width="1.6"/>')
    p.append(f'<path d="M27.5,11.5 L30,13.4 L27,16 Z" fill="{TEAL}"/>')
    return "".join(p)


def solo():
    """One browser window, one person - the localhost audience."""
    p = [f'<rect x="6" y="7" width="36" height="27" rx="2" fill="#ffffff" '
         f'stroke="{DARK}" stroke-width="1.6"/>',
         f'<path d="M6,13 H42" stroke="{DARK}" stroke-width="1.2"/>']
    p.append(f'<circle cx="24" cy="24" r="5.4" fill="none" stroke="{GREY}" stroke-width="1.8"/>')
    p.append(f'<path d="M16,41 A8,7 0 0 1 32,41" fill="none" stroke="{DARK}" stroke-width="1.8"/>')
    p.append(f'<circle cx="24" cy="35.5" r="4" fill="{DARK}"/>')
    return "".join(p)


def anyone():
    """A globe behind the browser window - reachable from anywhere."""
    p = [f'<circle cx="24" cy="24" r="19" fill="{ICE}" stroke="{BLUE}" stroke-width="1.4"/>']
    p.append(f'<ellipse cx="24" cy="24" rx="8" ry="19" fill="none" stroke="{BLUE}" stroke-width="1.1"/>')
    p.append(f'<path d="M5,24 H43" stroke="{BLUE}" stroke-width="1.1"/>')
    p.append(f'<path d="M8,14 H40 M8,34 H40" fill="none" stroke="{BLUE}" stroke-width="1.1"/>')
    p.append(f'<rect x="13" y="17" width="22" height="14" rx="2" fill="#ffffff" '
             f'stroke="{DARK}" stroke-width="1.6"/>')
    p.append(f'<circle cx="24" cy="24" r="3.4" fill="none" stroke="{DARK}" stroke-width="1.5"/>')
    return "".join(p)


ICONS = {
    "metadata": metadata,
    "pick-chunks": pick_chunks,
    "http-get": http_get,
    "gpu-upload": gpu_upload,
    "sharpen": sharpen,
    "convert": convert,
    "host": host,
    "share-link": share_link,
    "open-link": open_link,
    "first-view": first_view,
    "laptop": laptop,
    "solo": solo,
    "anyone": anyone,
}


def main(out=Path("static/icons/stream")):
    out.mkdir(parents=True, exist_ok=True)
    for name, fn in ICONS.items():
        (out / f"{name}.svg").write_text(HEAD + fn() + TAIL)
        print(out / f"{name}.svg")


if __name__ == "__main__":
    main(Path(sys.argv[1]) if len(sys.argv) > 1 else Path("static/icons/stream"))
