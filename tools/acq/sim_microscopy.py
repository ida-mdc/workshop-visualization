"""Confocal microscopy, simulated end to end.

The optical axis is y. The stage steps through the specimen and at each step
the microscope records one image of the plane in focus. The three panels are:

  panel 1   where the focal plane currently sits
  panel 2   the image the camera records there
  panel 3   the stack of every image recorded so far

Panel 3 is not a separate model of the specimen. It is literally the panel-2
images piled up in the order they were taken, which is the honest definition
of a z-stack - background, noise and all. If a speckle shows up in the image
it shows up in the volume, because they are the same numbers.

Two things the simulation gets right that matter pedagogically:

  * the point spread function is anisotropic. A confocal pinhole rejects out-
    of-focus light but the focal volume is still far longer along the optical
    axis than across it, so z is blurrier before anyone chooses a step size.
  * the noise is shot noise. Photon counting means the variance grows with
    the signal, so the dim background is grainy in a way that no amount of
    contrast stretching removes.
"""

import numpy as np

import specimen as sp
from common import Writer, gauss, norm

PLANES = 26              # stage steps along y
LAT = 56                 # camera pixels across x and z
FINE = (112, 104, 112)   # the specimen grid the optics act on
PSF_LAT = 1.1            # in fine voxels
PSF_AX = 4.2             # the optical axis is the bad one
PHOTONS = 220            # full-well counts at the brightest voxel


def run():
    bx, by, bz = sp.BOUNDS
    rs = np.random.default_rng(4)

    # --- what is actually in the dish --------------------------------------
    # Fluorophore concentration: bright in the specimen, with a dilute
    # unbound background in the surrounding medium.
    truth = sp.volume(FINE)
    truth = np.where(truth > 0, truth, 0.055 + 0.05 * rs.random(FINE) ** 3)

    # --- what the optics do to it ------------------------------------------
    blurred = gauss(truth, (PSF_LAT, PSF_AX, PSF_LAT))

    # --- what the camera records, one plane at a time ----------------------
    # Nearest-neighbour down to the camera's pixel grid and the stage's step,
    # then Poisson counting. No plane knows about any other plane.
    xi = ((np.arange(LAT) + 0.5) / LAT * FINE[0]).astype(int)
    zi = ((np.arange(LAT) + 0.5) / LAT * FINE[2]).astype(int)
    yi = ((np.arange(PLANES) + 0.5) / PLANES * FINE[1]).astype(int)

    clean = blurred[np.ix_(xi, yi, zi)]                    # (LAT, PLANES, LAT)
    counts = rs.poisson(np.clip(clean, 0, None) * PHOTONS).astype(np.float32)
    counts += rs.normal(0, 2.0, counts.shape)              # camera read noise
    stack = norm(counts, 0.0, float(np.percentile(counts, 99.6)))

    # A display gamma, the same one for every plane. This is a look-up on the
    # way to the screen, not a change to the data - panel 3 shows the same
    # curve so the two panels still match.
    shown = stack ** 0.72
    frames = [shown[:, s, :].T[::-1] for s in range(PLANES)]

    # Panel 3 is the stack. The volume and the frames are the same array.
    order = np.broadcast_to(np.arange(PLANES)[None, :, None],
                            stack.shape).copy()

    ys = -by + (np.arange(PLANES) + 0.5) * (2 * by / PLANES)
    lat_nm = 2 * bx / LAT
    ax_nm = 2 * by / PLANES

    w = Writer(
        'microscopy', PLANES,
        ['the slice being imaged', 'this image', 'the stack'],
        'slice',
        note='The microscope only ever images the plane in focus, and the '
             'stack of those images is the dataset - no 3D measurement '
             'happens anywhere. Panel 3 is panel 2 piled up, the same numbers, '
             'so the grainy background in the image is in the volume too. '
             'Sampling across a plane is the camera pixel; between planes it '
             'is how far the stage moved, and the focal volume is longer along '
             'the optical axis than across it, so z is the coarse axis twice '
             'over.',
    )
    w.geometry(y=ys)
    w.meta(voxel=[round(lat_nm, 4), round(ax_nm, 4), round(lat_nm, 4)],
           anisotropy=round(ax_nm / lat_nm, 2))
    w.readout([f'plane {s + 1} of {PLANES} · y = {y:+.2f} · '
               f'voxel {lat_nm:.3f} × {ax_nm:.3f} × {lat_nm:.3f}'
               for s, y in enumerate(ys)])
    w.frames(frames, cols=6)
    w.volume(shown, order=order)
    w.save()
