"""A laser scanner, simulated end to end.

The instrument sends a pulse in a known direction and times how long it takes
to come back. One direction, one distance. The mirror steps through a grid of
directions and that grid of distances is the measurement.

  panel 1   the beam being swept, column by column
  panel 2   the range image: one distance per direction, not a picture
  panel 3   each distance turned back into a position

Distance is measured rather than inferred, so this works on surfaces with no
texture at all - where photogrammetry gives up - and it arrives in real units
without putting a ruler in the scene.

The shadow is the thing to take away, and it is traced properly here: the
pulse stops at the first thing it meets, so everything behind the specimen
has no points and the range image has a black region where nothing came back.
A survey is several scan positions registered together for exactly that
reason, and occlusion gets planned before anybody presses a button.

The first-return rule is also what separates this from the echo methods. A
laser scanner keeps the first return and gets a surface; sonar and seismics
keep the whole returning waveform and get a volume.
"""

import numpy as np

import specimen as sp
from common import Field, Writer, gauss, norm, ramp_colour

COLUMNS = 48
ROWS = 36
FLOOR = -0.95
FLOOR_R = 1.7
ORIGIN = np.array([1.45, 0.92, 1.42])
FAN_U = 0.98                  # mirror sweep across, in tangent units
FAN_V = 0.76                  # and up
FINE = (112, 92, 112)
NEAR, FAR = 1.1, 3.6          # the window the range colours span

# Mid-dark throughout, so the same colours read on the range image's black
# background and against white in the point cloud.
DEPTH = ['#d9992f', '#b4384f', '#7a3a6b', '#2f3a63']
NO_RETURN = (0.030, 0.035, 0.050)     # the pulse never came back
UNSCANNED = (0.150, 0.163, 0.195)     # the mirror has not been here yet


def run():
    b = np.array(sp.BOUNDS)
    field = Field(gauss(sp.volume(FINE), (0.7, 0.7, 0.7)), b, level=0.18)

    fwd = -ORIGIN / np.linalg.norm(ORIGIN)
    right = np.array([-fwd[2], 0.0, fwd[0]])
    right /= np.linalg.norm(right)
    up = np.cross(right, fwd)

    us = (np.arange(COLUMNS) / (COLUMNS - 1) - 0.5) * FAN_U
    vs = (np.arange(ROWS) / (ROWS - 1) - 0.5) * FAN_V
    U, V = np.meshgrid(us, vs, indexing='ij')
    dirs = (fwd[None, :] + right[None, :] * U.ravel()[:, None]
            + up[None, :] * V.ravel()[:, None])
    dirs /= np.linalg.norm(dirs, axis=1, keepdims=True)

    # The pulse stops at whichever comes first: the specimen or the floor.
    rng_spec, _ = field.march(ORIGIN, dirs, near=0.3, far=5.0, step=0.010)
    with np.errstate(divide='ignore', invalid='ignore'):
        t_floor = (FLOOR - ORIGIN[1]) / dirs[:, 1]
    hitp = ORIGIN[None, :] + dirs * t_floor[:, None]
    on_disc = (t_floor > 0) & (np.hypot(hitp[:, 0], hitp[:, 2]) <= FLOOR_R)
    rng_floor = np.where(on_disc, t_floor, np.inf)
    rng_spec = np.where(rng_spec >= 0, rng_spec, np.inf)
    dist = np.minimum(rng_spec, rng_floor)
    got = np.isfinite(dist)

    dist2 = dist.reshape(COLUMNS, ROWS)
    got2 = got.reshape(COLUMNS, ROWS)

    # --- panel 2: the range image, gaining one column per mirror step ------
    shade = norm(np.where(got2, dist2, 0.0), NEAR, FAR)
    full = ramp_colour(DEPTH, shade)
    full[~got2] = np.array(NO_RETURN)
    frames = []
    for s in range(COLUMNS):
        img = np.zeros((ROWS, COLUMNS, 3), dtype=np.float32)
        img[:] = np.array(UNSCANNED)
        img[:, :s + 1] = np.transpose(full[:s + 1], (1, 0, 2))[::-1]
        frames.append(img)

    # --- panel 3: unproject -------------------------------------------------
    idx = np.nonzero(got)[0]
    pts = ORIGIN[None, :] + dirs[idx] * dist[idx][:, None]
    rgb = ramp_colour(DEPTH, norm(dist[idx], NEAR, FAR))
    first = idx // ROWS                                  # the column it came from

    counts = [int((first <= s).sum()) for s in range(COLUMNS)]
    misses = [int((~got2[:s + 1]).sum()) for s in range(COLUMNS)]

    w = Writer(
        'rangescan', COLUMNS,
        ['the sweep', 'the range image', 'the points'],
        'mirror sweep',
        note='What the scanner records is a range image - one distance per '
             'direction, not a picture. Turn each distance into a position '
             'and you have the points. Grey is where the mirror has not been '
             'yet; near-black is a direction the pulse never came back from. '
             'It stops at the first thing it meets, so the cloud has the '
             'specimen\'s shadow in it - which is why a survey is several '
             'registered scan positions, and why occlusion gets planned '
             'before anybody presses a button. Keeping only that first return '
             'is also what makes this a surface method rather than a volume '
             'one.',
    )
    w.geometry(column=list(range(COLUMNS)))
    w.meta(origin=[float(v) for v in ORIGIN], fwd=[float(v) for v in fwd],
           right=[float(v) for v in right], up=[float(v) for v in up],
           fan=[FAN_U, FAN_V], rows=ROWS, floor=FLOOR, floorRadius=FLOOR_R,
           range=[NEAR, FAR])
    w.readout([f'column {s + 1} of {COLUMNS} · {counts[s]:,} returns · '
               f'{misses[s]:,} directions came back empty'.replace(',', ' ')
               for s in range(COLUMNS)])
    w.frames(frames, cols=8)
    w.points(pts, rgb, first, b * np.array([1.6, 1.0, 1.6]))
    w.save()
