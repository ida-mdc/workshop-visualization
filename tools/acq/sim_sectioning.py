"""Serial sectioning, simulated end to end.

The specimen is cut into physical slices and each slice is imaged on its own.
That last part is the whole difference from confocal, and it is what the
simulation is built around:

  panel 1   the block, the knife, and the sections already taken
  panel 2   the image of this section - as it actually lands on the slide,
            at whatever offset and angle the handling gave it
  panel 3   those images stacked in the order they were cut

Stacking them raw gives a dataset that shears and wobbles, because nothing
has told the sections where they belong relative to each other. Registration
is not a tidying-up step here, it is the step that turns a pile of pictures
into a volume, and the toggle in the scene switches between the two.

The other honest details: lateral resolution is excellent (an electron or
light microscope looking straight at a cut face, no out-of-focus haze at all),
section thickness sets the z sampling, and sections are occasionally lost -
step 17 here is a hole in the data that no amount of processing recovers.
"""

import numpy as np

import specimen as sp
from common import Writer, gauss, norm, resample2d

SECTIONS = 26
LAT = 64                      # pixels across the cut face
FINE = (128, 104, 128)
LOST = {17}                   # a section that tore on the knife
DRIFT = 2.4                   # pixels of random walk per section
TILT = 0.035                  # radians of random walk per section


def run():
    bx, by, bz = sp.BOUNDS
    rs = np.random.default_rng(11)

    truth = sp.volume(FINE)
    truth = np.where(truth > 0, truth, 0.03 + 0.03 * rs.random(FINE) ** 3)
    # A cut face is imaged directly: sharp across, and each section averages
    # over its own thickness, which is the only blur along the cut axis.
    truth = gauss(truth, (0.7, 0.0, 0.7))

    xi = ((np.arange(LAT) + 0.5) / LAT * FINE[0]).astype(int)
    zi = ((np.arange(LAT) + 0.5) / LAT * FINE[2]).astype(int)
    edges = np.linspace(0, FINE[1], SECTIONS + 1).astype(int)

    # Every cut face first, so they share one intensity window. Staining and
    # beam dose still drift from section to section, which is the gain jitter.
    faces = []
    for s in range(SECTIONS):
        face = truth[:, edges[s]:edges[s + 1], :][np.ix_(
            xi, np.arange(edges[s + 1] - edges[s]), zi)].mean(axis=1)
        faces.append(face)
    window = float(np.percentile(np.stack(faces), 99.6))

    aligned = np.zeros((LAT, SECTIONS, LAT), dtype=np.float32)
    placed = np.zeros_like(aligned)
    frames, offsets = [], []

    dx = dz = tilt = 0.0
    for s in range(SECTIONS):
        # How the section sat on the slide: a random walk, because each one
        # is picked up by hand and nothing carries over but the operator.
        dx += rs.normal(0, DRIFT)
        dz += rs.normal(0, DRIFT)
        tilt += rs.normal(0, TILT)
        offsets.append([round(dx, 3), round(dz, 3), round(tilt, 4)])

        if s in LOST:
            frames.append(np.zeros((LAT, LAT), dtype=np.float32))
            continue

        gain = 1.0 + rs.normal(0, 0.08)
        face = faces[s] * gain + rs.normal(0, 0.010, faces[s].shape)
        face = norm(face, 0.0, window)

        aligned[:, s, :] = face
        placed[:, s, :] = resample2d(face.T, dx, dz, tilt).T
        frames.append(placed[:, s, :].T[::-1])

    ys = -by + (np.arange(SECTIONS) + 0.5) * (2 * by / SECTIONS)
    thick = 2 * by / SECTIONS
    order = np.broadcast_to(np.arange(SECTIONS)[None, :, None],
                            placed.shape).copy()

    w = Writer(
        'sectioning', SECTIONS,
        ['the slice being imaged', 'this image', 'the stack'],
        'slice',
        note='Cutting first means each section is imaged on its own, so '
             'nothing tells it where it belongs relative to its neighbours. '
             'Stack them as they come and the specimen shears and wobbles; '
             'registration is what turns the pile into a volume. Across a '
             'section the resolution is excellent, along the stack it is the '
             'section thickness - and a section that tears is simply gone.',
    )
    w.geometry(y=ys, offset=offsets)
    w.meta(thickness=round(thick, 4), lost=sorted(LOST),
           voxel=[round(2 * bx / LAT, 4), round(thick, 4),
                  round(2 * bz / LAT, 4)])
    w.readout([
        f'section {s + 1} of {SECTIONS} · '
        + ('lost on the knife' if s in LOST
           else f'off by {np.hypot(*offsets[s][:2]) * 2 * bx / LAT:.3f}, '
                f'{np.degrees(offsets[s][2]):+.1f}°')
        for s in range(SECTIONS)])
    w.frames(frames, cols=6)
    w.volume(placed, order=order, variants={'registered': aligned})
    w.save()
