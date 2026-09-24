"""Photogrammetry, simulated end to end.

Walk round the specimen taking ordinary photographs, then let two algorithms
do the work: structure from motion recovers where every camera was standing by
matching features that appear in several images, and multi-view stereo
triangulates each surface point from the images that can see it.

  panel 1   the camera positions walked so far
  panel 2   the photographs taken so far, as a contact sheet
  panel 3   the points triangulated from them

The photographs are ray traced against the same specimen the other panels
use, with a fixed surface texture - fixed because it has to be. A feature can
only be matched between two images if that patch of surface looks the same in
both, and that is the entire reason photogrammetry fails on anything shiny,
transparent or plain.

Visibility is traced, not guessed. A surface point counts as seen by a camera
only when the line to it is unobstructed, so petals genuinely hide each other
and the reconstruction has the gaps that implies. A point needs MIN_VIEWS
cameras before it exists at all; move the slider back and most of the cloud
does not exist yet.
"""

import numpy as np

import specimen as sp
from common import Field, Writer, gauss, norm, surface_points

SHOTS = 14
MIN_VIEWS = 3
THUMB = (56, 44)              # one photograph in the contact sheet, w x h
SHEET = (5, 3)                # the contact sheet grid, cols x rows
GAP = 2
CANDIDATES = 4200
RADIUS = 2.05
FINE = (112, 92, 112)


def cameras():
    """Where the photographer stood: a ring at varying height, all aimed in."""
    out = []
    for i in range(SHOTS):
        a = (i / SHOTS) * 2 * np.pi + 0.35
        h = 0.55 + 0.45 * np.sin(i * 1.9)
        out.append([np.cos(a) * RADIUS, h, np.sin(a) * RADIUS])
    return np.array(out)


def _basis(eye):
    fwd = -eye / np.linalg.norm(eye)
    right = np.array([-fwd[2], 0.0, fwd[0]])
    right /= np.linalg.norm(right)
    up = np.cross(right, fwd)
    return fwd, right, up


def texture(pts):
    """A fixed pattern painted on the surface, so features are matchable."""
    x, y, z = pts[:, 0], pts[:, 1], pts[:, 2]
    t = (np.sin(11.3 * x + 2.1) * np.sin(9.7 * z - 1.3) * np.sin(13.1 * y)
         + 0.5 * np.sin(23.7 * x - 4.2) * np.sin(21.3 * z + 0.7))
    return np.clip(0.78 + 0.22 * t, 0.42, 1.0)


def albedo(pts):
    """Surface colour: the specimen's own, with the matchable grain on top.

    Photogrammetry is the only method in this sequence that measures colour,
    so this has to be the real thing - green stem, gold centre, rose petals,
    the same tints the mesh in panel 1 carries. A single flat pink would be
    a colormap wearing a disguise.
    """
    return np.clip(sp.colour(pts) * (0.82 + 0.18 * texture(pts))[:, None],
                   0, 1)


def photograph(field, eye, size):
    """Ray trace one colour photograph of the specimen from `eye`."""
    w, h = size
    fwd, right, up = _basis(np.asarray(eye, dtype=np.float64))
    px = (np.arange(w) + 0.5) / w * 2 - 1
    py = 1 - (np.arange(h) + 0.5) / h * 2
    gx, gy = np.meshgrid(px, py)
    scale = 0.46          # a normal lens: the specimen fills the frame
    dirs = (fwd[None, :] + right[None, :] * (gx.ravel() * scale)[:, None]
            + up[None, :] * (gy.ravel() * scale * h / w)[:, None])
    dirs /= np.linalg.norm(dirs, axis=1, keepdims=True)

    dist, hit = field.march(eye, dirs, near=0.4, far=4.0, step=0.014)
    img = np.zeros((h * w, 3), dtype=np.float32)
    # a plain studio backdrop, slightly graded
    img[:] = np.array([0.90, 0.91, 0.93]) - 0.06 * gy.ravel()[:, None]

    if hit.any():
        p = np.asarray(eye) + dirs[hit] * dist[hit][:, None]
        n = field.normal(p)
        key = np.array([0.5, 0.78, 0.38])
        key /= np.linalg.norm(key)
        fill = np.array([-0.4, 0.3, -0.7])
        fill /= np.linalg.norm(fill)
        lam = (0.70 * np.clip(n @ key, 0, 1)
               + 0.26 * np.clip(n @ fill, 0, 1) + 0.30)
        img[hit] = np.clip(albedo(p) * lam[:, None], 0, 1)
    return img.reshape(h, w, 3)


def run():
    b = np.array(sp.BOUNDS)
    field = Field(gauss(sp.volume(FINE), (0.7, 0.7, 0.7)), b, level=0.18)
    eyes = cameras()

    # --- panel 2: the contact sheet ----------------------------------------
    shots = [photograph(field, e, THUMB) for e in eyes]
    cols, rows = SHEET
    fw = cols * (THUMB[0] + GAP) + GAP
    fh = rows * (THUMB[1] + GAP) + GAP
    # A light board rather than a dark one. Early in the scan most of the
    # grid is still empty, and on black that reads as a hole in the slide
    # instead of as photographs not taken yet.
    frames = []
    for s in range(SHOTS):
        sheet = np.full((fh, fw, 3), 0.92, dtype=np.float32)
        for r in range(rows):
            for c in range(cols):
                y0 = GAP + r * (THUMB[1] + GAP)
                x0 = GAP + c * (THUMB[0] + GAP)
                sheet[y0:y0 + THUMB[1], x0:x0 + THUMB[0]] = 0.86
        for i in range(s + 1):
            r, c = divmod(i, cols)
            y0 = GAP + r * (THUMB[1] + GAP)
            x0 = GAP + c * (THUMB[0] + GAP)
            tile = shots[i] if i == s else 0.25 + 0.75 * shots[i]
            sheet[y0:y0 + THUMB[1], x0:x0 + THUMB[0]] = tile
            if i == s:      # the one just taken
                sheet[y0 - 1, x0 - 1:x0 + THUMB[0] + 1] = [1.0, 0.72, 0.25]
                sheet[y0 + THUMB[1], x0 - 1:x0 + THUMB[0] + 1] = [1.0, 0.72, 0.25]
                sheet[y0 - 1:y0 + THUMB[1] + 1, x0 - 1] = [1.0, 0.72, 0.25]
                sheet[y0 - 1:y0 + THUMB[1] + 1, x0 + THUMB[0]] = [1.0, 0.72, 0.25]
        frames.append(sheet)

    # --- panel 3: triangulate ----------------------------------------------
    pts = surface_points(field, CANDIDATES)
    # visible[i, j] - does camera i have an unobstructed line to point j?
    visible = np.zeros((SHOTS, len(pts)), dtype=bool)
    for i, eye in enumerate(eyes):
        to = eye[None, :] - pts
        facing = np.einsum('ij,ij->i', field.normal(pts),
                           to / np.linalg.norm(to, axis=1, keepdims=True)) > 0.15
        seen = np.zeros(len(pts), dtype=bool)
        seen[facing] = ~field.occluded(pts[facing], eye)
        visible[i] = seen

    views = np.cumsum(visible, axis=0)                 # after each shot
    first = np.full(len(pts), 255, dtype=np.int32)
    for s in range(SHOTS):
        new = (views[s] >= MIN_VIEWS) & (first == 255)
        first[new] = s
    keep = first < 255
    pts, first = pts[keep], first[keep]

    # Real colour, not a colormap: every point was seen in photographs, and
    # this is what those photographs recorded. Albedo only, with no shading
    # baked in - a real pipeline stores surface colour per point and lets the
    # viewer light it, and the scene does light it.
    rgb = albedo(pts)

    counts = [int(((first <= s)).sum()) for s in range(SHOTS)]

    w = Writer(
        'photogrammetry', SHOTS,
        ['where the photographs were taken', 'the photographs',
         'points triangulated'],
        'photographs taken',
        note='Each photograph is only a photograph. Structure from motion '
             f'recovers where they were taken by matching features between '
             f'them, then multi-view stereo triangulates each surface point '
             f'from the images that can see it - so a point needs at least '
             f'{MIN_VIEWS} unobstructed views before it exists at all. '
             'Surfaces only, no interior ever, and only where there is '
             'texture to match: shiny, clear or plain gives nothing. The '
             'colour in panel 3 is the one thing here that was measured '
             'rather than chosen - it comes straight off the photographs, '
             'which no other method on these slides gives you.',
    )
    w.geometry(eye=eyes)
    w.meta(minViews=MIN_VIEWS, candidates=int(len(pts)))
    w.readout([f'{s + 1} of {SHOTS} photographs · '
               f'{counts[s]:,} points triangulated'.replace(',', ' ')
               for s in range(SHOTS)])
    w.frames(frames, cols=4)
    w.points(pts, rgb, first, b)
    w.save()
