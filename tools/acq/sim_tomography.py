"""Parallel-beam tomography, simulated end to end.

The geometry is one geometry, used by all three panels: a parallel beam
travelling along d(theta), a flat 2D detector whose columns run along
a(theta) = d rotated 90 degrees and whose rows are the rotation axis y.

  panel 1   where the beam and detector are at this angle
  panel 2   the radiograph the detector records there: transmission,
            I/I0 = exp(-integral of mu along the ray)
  panel 3   the volume back-projected from every angle recorded so far

Because the rotation axis is y and the beam is parallel, each detector *row*
is an independent 2D problem: row j reconstructs slice y=j. Reconstruct every
row and you have the whole volume, not a slab - which is exactly what a real
parallel-beam tomograph does.

Back-projection is done both ways, so the scene can switch between them.
Smearing the raw projections back and adding them up gives an irrecoverable
blur - that is what plain back-projection does. Running each projection
through a ramp filter first gives a sharp volume, and that filter is the F in
FBP. With few angles the filtered version shows streaks instead, which is the
artefact worth recognising.
"""

import numpy as np

import specimen as sp
from common import Writer, gauss, norm

ANGLES = 30              # rotation steps, 0..180 degrees
N = 44                   # reconstruction grid, x and z
NY = 34                  # rows = slices
DET = 64                 # detector elements across
RAY = 72                 # integration samples along each ray
DET_W = 1.42             # detector half-width in world units
FRAME = (88, 68)         # panel-2 tile, width x height

SIM = (96, NY, 96)       # the specimen grid the beam actually travels through


def _sample_xz(field, xs, zs, bx, bz):
    """Bilinear sample field[x, y, z] at world (xs, zs), keeping all y.

    Returns (len(xs), ny). Out-of-bounds samples read as zero.
    """
    nx, ny, nz = field.shape
    fx = (xs + bx) / (2 * bx) * nx - 0.5
    fz = (zs + bz) / (2 * bz) * nz - 0.5
    x0 = np.floor(fx).astype(np.int64)
    z0 = np.floor(fz).astype(np.int64)
    tx = (fx - x0)[:, None].astype(np.float32)
    tz = (fz - z0)[:, None].astype(np.float32)
    ok = (x0 >= 0) & (x0 < nx - 1) & (z0 >= 0) & (z0 < nz - 1)
    x0 = np.clip(x0, 0, nx - 2)
    z0 = np.clip(z0, 0, nz - 2)

    c00 = field[x0, :, z0]
    c10 = field[x0 + 1, :, z0]
    c01 = field[x0, :, z0 + 1]
    c11 = field[x0 + 1, :, z0 + 1]
    out = ((c00 * (1 - tx) + c10 * tx) * (1 - tz)
           + (c01 * (1 - tx) + c11 * tx) * tz)
    return np.where(ok[:, None], out, 0.0).astype(np.float32)


def ramp(sino):
    """Ram-Lak ramp filter with a Hann window, along the detector axis.

    This is the whole difference between back-projection and *filtered* back-
    projection: smearing projections back double-counts low frequencies, and
    the ramp is the correction for that.
    """
    n = 1 << int(np.ceil(np.log2(DET * 2)))
    f = np.fft.rfftfreq(n)
    h = 2 * f * (0.5 + 0.5 * np.cos(np.pi * f / f.max()))
    pad = np.zeros((sino.shape[0], n, sino.shape[2]), dtype=np.float32)
    pad[:, :DET] = sino
    spec = np.fft.rfft(pad, axis=1) * h[None, :, None]
    return np.fft.irfft(spec, n=n, axis=1)[:, :DET].astype(np.float32)


def run():
    bx, by, bz = sp.BOUNDS

    # --- the specimen as attenuation coefficients ---------------------------
    mu = sp.volume(SIM)                       # 0..1, no background: air is air
    mu = gauss(mu, (0.8, 0.8, 0.8))           # finite source and detector blur

    # --- the truth on the reconstruction grid, for the error readout --------
    truth = sp.volume((N, NY, N))
    truth = norm(gauss(truth, (0.6, 0.6, 0.6)))

    thetas = np.linspace(0, np.pi, ANGLES, endpoint=False)

    # detector coordinate and ray parameter
    u = (np.arange(DET) + 0.5) / DET * 2 * DET_W - DET_W
    t = np.linspace(-1.9, 1.9, RAY)
    ds = (t[1] - t[0])

    # --- acquire every projection ------------------------------------------
    # sinogram[angle, detector column, row] = line integral of mu
    sino = np.zeros((ANGLES, DET, NY), dtype=np.float32)
    for i, th in enumerate(thetas):
        dx, dz = np.cos(th), np.sin(th)          # along the beam
        ax, az = -np.sin(th), np.cos(th)         # across the detector
        xs = (u[:, None] * ax + t[None, :] * dx).ravel()
        zs = (u[:, None] * az + t[None, :] * dz).ravel()
        vals = _sample_xz(mu, xs, zs, bx, bz).reshape(DET, RAY, NY)
        sino[i] = vals.sum(axis=1) * ds

    peak = float(sino.max())
    k = 2.6 / max(peak, 1e-6)                   # contrast of the radiograph

    # --- panel 2: the radiograph, as transmission ---------------------------
    frames = []
    for i in range(ANGLES):
        trans = np.exp(-k * sino[i])            # Beer-Lambert, I/I0
        img = np.array(np.repeat(np.repeat(trans.T[::-1],
                                           max(1, FRAME[1] // NY), axis=0),
                                 max(1, FRAME[0] // DET), axis=1))
        img = _fit(img, FRAME)
        rgb = np.stack([img * 0.97, img * 0.985, img], axis=-1)
        frames.append(rgb)

    # --- panel 3: back-project, one angle at a time -------------------------
    gx = -bx + (np.arange(N) + 0.5) * (2 * bx / N)
    gz = -bz + (np.arange(N) + 0.5) * (2 * bz / N)
    X, Z = np.meshgrid(gx, gz, indexing='ij')

    filtered = ramp(sino)

    acc = {'fbp': np.zeros((N, NY, N), dtype=np.float32),
           'raw': np.zeros((N, NY, N), dtype=np.float32)}
    vols, plain, errs = [], [], []
    for i, th in enumerate(thetas):
        ax, az = -np.sin(th), np.cos(th)
        pos = (X * ax + Z * az + DET_W) / (2 * DET_W) * DET - 0.5
        d0 = np.clip(np.floor(pos).astype(np.int64), 0, DET - 2)
        w = (pos - d0).astype(np.float32)
        for key, src in (('fbp', filtered), ('raw', sino)):
            p = src[i]                                  # (DET, NY)
            smear = p[d0] * (1 - w)[..., None] + p[d0 + 1] * w[..., None]
            acc[key] += np.transpose(smear, (0, 2, 1))  # (N, NY, N)

        # FBP produces negatives outside the specimen; air is not less than
        # nothing, so they are clipped, exactly as a real pipeline does.
        # Scaling to a high percentile rather than the maximum is the window
        # any viewer applies: a handful of hot voxels in the receptacle would
        # otherwise push everything else down into the bottom tenth of the
        # range, and the specimen renders as a shadow.
        clipped = np.clip(acc['fbp'], 0, None) / (i + 1)
        v = norm(clipped, 0.0, float(np.percentile(clipped, 99.5)))
        vols.append(v)
        plain.append(norm(acc['raw'], 0.0,
                          float(np.percentile(acc['raw'], 99.5))))
        errs.append(float(np.sqrt(np.mean((v - truth) ** 2))))

    w = Writer(
        'tomography', ANGLES,
        ['the beam and the detector', 'what this angle records',
         'reconstructed'],
        'rotation',
        note='Nothing here measures a voxel. Each angle records one '
             'radiograph - how much of the beam survived the trip through - '
             'and panel 3 is those radiographs smeared back along the '
             'direction they came from, for real. Switch the ramp filter off '
             'to see why the F in FBP is there. With the filter on, too few '
             'angles gives streaks rather than blur. Either way the volume is '
             'computed, so its artefacts belong to the maths, not to the '
             'specimen.',
    )
    w.geometry(angle=thetas, detectorWidth=[2 * DET_W] * ANGLES)
    w.meta(detector=[2 * DET_W, 2 * by * 1.05], parallel=True)
    w.readout([f'{i + 1} of {ANGLES} angles · {np.degrees(th):.0f}° · '
               f'error {e:.3f}' for i, (th, e) in enumerate(zip(thetas, errs))])
    w.frames(frames, cols=6)
    w.volume_series(vols, variants={'unfiltered': plain})
    w.save()


def _fit(img, size):
    """Nearest-neighbour resize to exactly (w, h)."""
    tw, th = size
    h, wd = img.shape
    yi = (np.arange(th) * h // th).clip(0, h - 1)
    xi = (np.arange(tw) * wd // tw).clip(0, wd - 1)
    return img[yi][:, xi]
