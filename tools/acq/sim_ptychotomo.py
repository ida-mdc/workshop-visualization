"""Ptychographic tomography: the same rotation, a different contrast.

Everything that makes tomography tomography is here - turn the specimen,
record something at each angle, reconstruct the volume from the set. What
changes is what "record something" means.

Absorption tomography measures how much of the beam did not arrive, and that
is a single number per detector pixel. Ptychography measures the diffraction
pattern from an illuminated patch, scans overlapping patches across the
specimen, and *solves* for a complex transmission function - from which the
phase is the useful part, because phase shift is proportional to how much
material the beam passed through.

So each angle costs a whole two-dimensional scan and a phase-retrieval run,
and yields one projection. Thirty angles, thirty scans, one volume.

  panel 1   the rig at this angle, and the scan pattern on the specimen
  panel 2   what this angle records: the diffraction pattern from one scan
            position, and the projection solved for from all of them
  panel 3   those projections back-projected into a volume

Why anyone pays for this: phase contrast is enormously more sensitive than
absorption for light elements. A soft-tissue or polymer sample that is almost
transparent to X-rays - nearly invisible in a radiograph - still shifts the
phase measurably. The price is the scan, the coherent beam and the compute,
which is why absorption CT is a benchtop instrument and this is a synchrotron.

The ePIE reconstruction at each angle is real, run over a real overlapping
scan of real diffraction patterns. The tomographic step afterwards is the
same filtered back-projection the absorption pipeline uses, because at that
point the data is just projections and the maths does not care where they
came from.
"""

import numpy as np

import specimen as sp
from common import Writer, gauss, norm, ramp_colour
from sim_tomography import DET, DET_W, NY, N, RAY, _sample_xz, ramp

ANGLES = 30
SIM = (96, NY, 96)

PROBE = 24               # illuminated patch, in projection pixels
STRIDE = 6               # 75 percent overlap
ITERS = 3                # ePIE passes per angle
PHASE_MAX = 2.4          # radians at the thickest point; stays under pi

PATTERN = ['#05060c', '#232c63', '#b4384f', '#f0c04a', '#fff6e0']
PHASE_MAP = ['#ffffff', '#c2d3e0', '#7c9db9', '#3c6489', '#12304c']
GAP = 4


def _epie(obj, probe, positions, iters):
    """Recover a complex object from its diffraction patterns.

    Standard ePIE: propagate the exit wave to the detector, keep the computed
    phase, replace the modulus with the measured one, propagate back, and
    nudge the object towards what that implies. The only place the data
    enters is the modulus swap.
    """
    n = PROBE
    mags = []
    for ox, oy in positions:
        psi = probe * obj[ox:ox + n, oy:oy + n]
        mags.append(np.abs(np.fft.fft2(psi)))

    est = np.ones_like(obj)
    pconj = np.conj(probe)
    pmax = float((np.abs(probe) ** 2).max())
    for _ in range(iters):
        for k, (ox, oy) in enumerate(positions):
            patch = est[ox:ox + n, oy:oy + n]
            psi = probe * patch
            far = np.fft.fft2(psi)
            far = mags[k] * np.exp(1j * np.angle(far))
            est[ox:ox + n, oy:oy + n] = patch + pconj * (
                np.fft.ifft2(far) - psi) / pmax
    return est, mags


def run():
    bx, by, bz = sp.BOUNDS
    rs = np.random.default_rng(17)

    # --- the specimen, as something that shifts phase ----------------------
    density = gauss(sp.volume(SIM), (0.8, 0.8, 0.8))

    thetas = np.linspace(0, np.pi, ANGLES, endpoint=False)
    u = (np.arange(DET) + 0.5) / DET * 2 * DET_W - DET_W
    t = np.linspace(-1.9, 1.9, RAY)
    ds = t[1] - t[0]

    # --- the projections, before anything is measured ----------------------
    # Phase shift is proportional to material along the beam, so the true
    # projection is the same line integral absorption tomography takes - of
    # a different quantity.
    truth = np.zeros((ANGLES, DET, NY), dtype=np.float32)
    for i, th in enumerate(thetas):
        dx, dz = np.cos(th), np.sin(th)
        ax, az = -np.sin(th), np.cos(th)
        xs = (u[:, None] * ax + t[None, :] * dx).ravel()
        zs = (u[:, None] * az + t[None, :] * dz).ravel()
        vals = _sample_xz(density, xs, zs, bx, bz).reshape(DET, RAY, NY)
        truth[i] = vals.sum(axis=1) * ds
    truth = truth / max(float(truth.max()), 1e-9) * PHASE_MAX

    # --- the probe ----------------------------------------------------------
    g = np.arange(PROBE) - (PROBE - 1) / 2
    gx, gy = np.meshgrid(g, g, indexing='ij')
    probe = np.exp(-(gx ** 2 + gy ** 2) / (2 * (PROBE / 6.0) ** 2))
    rough = gauss(rs.normal(0, 1, (PROBE, PROBE)).astype(np.float32),
                  (2.0, 2.0))
    probe = (probe * np.exp(1j * 2.0 * rough / max(rough.std(), 1e-6)))
    probe = probe.astype(np.complex64)
    probe /= np.sqrt((np.abs(probe) ** 2).sum())

    # The projection is DET x NY; pad it to a square the scan can cover.
    side = max(DET, NY) + PROBE
    starts = list(range(0, side - PROBE + 1, STRIDE))
    positions = []
    for row, oy in enumerate(starts):
        order = starts if row % 2 == 0 else starts[::-1]
        positions += [(ox, oy) for ox in order]
    pad_x = (side - DET) // 2
    pad_y = (side - NY) // 2

    # --- one scan, one reconstruction, per angle ----------------------------
    recovered = np.zeros_like(truth)
    patterns = []
    for i in range(ANGLES):
        canvas = np.zeros((side, side), dtype=np.float64)
        canvas[pad_x:pad_x + DET, pad_y:pad_y + NY] = truth[i]
        obj = ((1.0 - 0.12 * canvas / PHASE_MAX)
               * np.exp(1j * canvas)).astype(np.complex64)

        est, mags = _epie(obj, probe, positions, ITERS)

        # A global phase offset is unmeasurable, so it has to be removed
        # before the projections can be stacked into a sinogram - exactly
        # what a real pipeline does. The estimate comes from the whole outer
        # frame of the scanned area, which is empty by construction; getting
        # it wrong leaves a pedestal on every projection, and a pedestal
        # back-projects into a starburst.
        got = np.angle(est)
        border = np.concatenate([
            got[:4, :].ravel(), got[-4:, :].ravel(),
            got[:, :4].ravel(), got[:, -4:].ravel()])
        got -= np.median(border)
        # Most of a projection is empty - four fifths of it, for this
        # specimen - so its median *is* the background, and subtracting it
        # is both robust and correct.
        crop = got[pad_x:pad_x + DET, pad_y:pad_y + NY]
        recovered[i] = np.clip(crop - np.median(crop), 0, None)

        # One pattern to show: the scan position nearest the middle.
        middle = min(positions,
                     key=lambda p: (p[0] - side / 2) ** 2 + (p[1] - side / 2) ** 2)
        patterns.append(np.fft.fftshift(
            mags[positions.index(middle)] ** 2))

    err = float(np.sqrt(np.mean((recovered - truth) ** 2)) / PHASE_MAX)

    # --- panel 2: the pattern and the projection it helped solve ------------
    frames = []
    for i in range(ANGLES):
        pat = patterns[i]
        rel = pat / max(pat.max(), 1e-12)
        decades = 5.0
        shown = np.clip((np.log10(rel + 10 ** -decades) + decades) / decades,
                        0, 1)
        left = ramp_colour(PATTERN, shown)
        left = _fit(left, DET)

        proj = norm(recovered[i].T[::-1], 0.0, PHASE_MAX)
        right = ramp_colour(PHASE_MAP, proj)

        # One above the other rather than side by side: they are two stages
        # of the same angle, not two views of it, and reading downwards is
        # how that sequence goes.
        w = max(left.shape[1], right.shape[1])
        h = left.shape[0] + GAP + right.shape[0]
        tile = np.ones((h, w, 3), dtype=np.float32)
        tile[:left.shape[0], _slot(w, left.shape[1])] = left
        tile[left.shape[0] + GAP:, _slot(w, right.shape[1])] = right
        frames.append(tile)

    top = DET / (DET + GAP + recovered.shape[2])
    parts = [
        {'label': 'one diffraction pattern', 'y0': 0.0, 'y1': top},
        {'label': 'the projection solved from the whole scan',
         'y0': top + GAP / (DET + GAP + recovered.shape[2]), 'y1': 1.0},
    ]

    # --- panel 3: back-project the recovered projections --------------------
    gx_ = -bx + (np.arange(N) + 0.5) * (2 * bx / N)
    gz_ = -bz + (np.arange(N) + 0.5) * (2 * bz / N)
    X, Z = np.meshgrid(gx_, gz_, indexing='ij')

    filtered = ramp(recovered)
    acc = np.zeros((N, NY, N), dtype=np.float32)
    vols = []
    for i, th in enumerate(thetas):
        ax, az = -np.sin(th), np.cos(th)
        pos = (X * ax + Z * az + DET_W) / (2 * DET_W) * DET - 0.5
        d0 = np.clip(np.floor(pos).astype(np.int64), 0, DET - 2)
        w = (pos - d0).astype(np.float32)
        p = filtered[i]
        smear = p[d0] * (1 - w)[..., None] + p[d0 + 1] * w[..., None]
        acc += np.transpose(smear, (0, 2, 1))
        clipped = np.clip(acc, 0, None) / (i + 1)
        vols.append(norm(clipped, 0.0, float(np.percentile(clipped, 99.5))))

    w = Writer(
        'ptychotomo', ANGLES,
        ['the beam and the detector', 'what this angle records',
         'reconstructed'],
        'rotation',
        note='Same rotation, same reconstruction, different contrast. '
             'Instead of measuring how much of the beam failed to arrive, '
             'each angle records diffraction patterns from overlapping '
             'patches and solves them for a complex transmission function - '
             'the whole of panel 2 is one angle. Its phase is proportional '
             'to material along the beam, so it is a projection like any '
             'other, and panel 3 back-projects them exactly as the '
             'absorption pipeline does. What you buy is sensitivity: a '
             'polymer or soft-tissue sample almost invisible in a radiograph '
             'still shifts the phase. What you pay is a full scan and a '
             'phase-retrieval run at every angle, plus a coherent beam - '
             'which is why absorption CT fits on a bench and this does not.',
    )
    w.geometry(angle=thetas)
    w.meta(detector=[2 * DET_W, 2 * by * 1.05], parallel=False, parts=parts,
           scan=[[float((ox + PROBE / 2 - pad_x) / DET * 2 * DET_W - DET_W),
                  float((oy + PROBE / 2 - pad_y) / NY * 2 * by - by)]
                 for ox, oy in positions],
           spot=float(PROBE / DET * DET_W),
           overlap=round(1 - STRIDE / PROBE, 3))
    w.readout([f'{i + 1} of {ANGLES} angles · {np.degrees(th):.0f}° · '
               f'{len(positions)} scan positions each · error {err:.3f}'
               for i, th in enumerate(thetas)])
    w.frames(frames, cols=6)
    w.volume_series(vols)
    w.save()


def _slot(height, h):
    top = (height - h) // 2
    return slice(top, top + h)


def _fit(img, size):
    """Nearest-neighbour resize of an (h, w, 3) image to size x size."""
    h, wd = img.shape[:2]
    yi = (np.arange(size) * h // size).clip(0, h - 1)
    xi = (np.arange(size) * wd // size).clip(0, wd - 1)
    return img[yi][:, xi]
