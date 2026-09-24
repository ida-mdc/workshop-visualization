"""Echo sounding, simulated end to end.

Seismics, sonar, ultrasound and ground-penetrating radar are all the same
measurement: send a pulse, record what comes back, and use the travel time as
a distance. So far that is a laser scanner. The difference is what gets kept.

A laser scanner keeps the *first* return and throws the rest away, so it
measures a surface. An echo instrument records the *whole* returning
waveform, so every reflector along the path leaves its own arrival in the
trace - including the ones underneath the first one. That is what turns a
time-of-flight measurement into a volume.

  panel 1   the shot position on the surface and the wavefront going down
  panel 2   the traces recorded so far, as a gather: shot across, time down
  panel 3   the volume those traces migrate to

The modelling is Kirchhoff: every reflecting point contributes a Ricker
wavelet to the trace, arriving at two-way time 2r/c and weighted by 1/r^2 for
spreading. The reconstruction is Kirchhoff migration, which sums each trace
back over the surface of constant travel time - the exact dual of the
back-projection that tomography uses, and it fails the same way when there
are not enough shots.

The buried layers are the point of the picture. A scanner sees the top of the
sediment and nothing else; this sees the top, the specimen inside, and the
two horizons below it, because all of them put an arrival in the same trace.
"""

import numpy as np

import specimen as sp
from common import Writer, envelope, gauss, gauss1d, norm, ramp_colour

GRID = 9                  # shots across, so GRID*GRID positions in total
APERTURE = 1.70           # how far the survey spreads either side
BEAM = 2.0                # transducer directivity: weight is cos(theta)^BEAM
N = 40                    # migrated volume, x and z
NY = 30                   # and depth
SAMPLES = 176             # samples in a trace
FREQ = 9.0                # Ricker centre frequency: higher resolves better
SPEED = 1.0               # travel time is 2r/SPEED
SURFACE = 1.15            # the shots sit this far above the volume centre
FLOOR = -0.86              # one reflecting surface under the specimen
FLOOR_R = 1.55             # how far it reaches
FLOOR_STRENGTH = 0.34
FINE = (88, 70, 88)
FRAME = (108, 96)

GATHER = ['#14203a', '#3f6f9e', '#f4f6f8', '#d8863c', '#5c1f2e']


def run():
    bx, by, bz = sp.BOUNDS

    # --- what reflects ------------------------------------------------------
    # An echo comes from a *change* in impedance, not from material as such,
    # so the reflectivity is the gradient of the medium rather than the
    # medium itself. Which is why echo images show boundaries.
    vol = gauss(sp.volume(FINE), (1.0, 1.0, 1.0))
    grad = np.zeros_like(vol)
    for axis in range(3):
        d = np.diff(vol, axis=axis, prepend=np.take(vol, [0], axis=axis))
        grad += d ** 2
    refl = np.sqrt(grad)
    refl = norm(refl, 0.0, float(np.percentile(refl, 99.7)))

    # One surface under the specimen, the same disc the laser scanner stands
    # on. That is the whole comparison: the scanner leaves a shadow on it and
    # this does not, because the pulse carries on through.
    pts, (xs, ys, zs) = sp.grid_points(FINE)
    X = pts[:, 0].reshape(FINE)
    Y = pts[:, 1].reshape(FINE)
    Z = pts[:, 2].reshape(FINE)
    disc = np.hypot(X, Z) <= FLOOR_R
    near = np.exp(-0.5 * ((Y - FLOOR) / 0.035) ** 2) * disc
    refl = np.maximum(refl, FLOOR_STRENGTH * near.astype(np.float32))

    # Thin it out to the scatterers that matter; the sum below is over these.
    keep = refl > 0.12
    sx = pts[:, 0].reshape(FINE)[keep]
    sy = pts[:, 1].reshape(FINE)[keep]
    sz = pts[:, 2].reshape(FINE)[keep]
    sr = refl[keep]

    # --- the shots ----------------------------------------------------------
    # A wide survey: aperture is what buys lateral resolution, exactly as
    # angular coverage does in tomography. Too narrow and every reflector
    # migrates into an arc instead of a point.
    gx = np.linspace(-APERTURE, APERTURE, GRID)
    gz = np.linspace(-APERTURE, APERTURE, GRID)
    shots = []
    for j, z0 in enumerate(gz):
        row = gx if j % 2 == 0 else gx[::-1]
        shots += [(float(x0), SURFACE, float(z0)) for x0 in row]
    steps = len(shots)

    # Two-way time is scaled so the deepest reflector lands inside the trace.
    far = SURFACE + by + 0.3
    dt = (2 * far / SPEED) / (SAMPLES - 6)

    # --- record: one trace per shot ----------------------------------------
    t_axis = np.arange(SAMPLES) * dt
    traces = np.zeros((steps, SAMPLES), dtype=np.float32)
    for i, (x0, y0, z0) in enumerate(shots):
        r = np.sqrt((sx - x0) ** 2 + (sy - y0) ** 2 + (sz - z0) ** 2)
        tt = 2 * r / SPEED
        # A transducer does not radiate sideways: the obliquity factor is why
        # a survey has to pass over a target, not merely near it.
        obliq = np.clip((y0 - sy) / np.maximum(r, 1e-6), 0, 1) ** BEAM
        amp = sr * obliq / np.maximum(r, 0.4) ** 2
        # Every scatterer puts a wavelet in the same trace - which is the
        # whole difference from keeping only the first return.
        lag = t_axis[None, :] - tt[:, None]
        w = (1 - 2 * (np.pi * FREQ * lag) ** 2) * np.exp(-(np.pi * FREQ * lag) ** 2)
        traces[i] = (amp[:, None] * w).sum(axis=0)

    traces /= max(float(np.abs(traces).max()), 1e-9)
    env = envelope(traces, axis=1).astype(np.float32)

    # --- panel 2: the gather, filling in one trace at a time ---------------
    # With a time gain, because spreading makes late arrivals far weaker than
    # early ones and nobody looks at raw amplitudes. Blue and red are the two
    # signs of the wiggle; white is zero.
    gain = 1.0 + 3.2 * (t_axis / t_axis[-1]) ** 1.6
    shown = np.clip(traces * gain[None, :] * 2.4, -1, 1)
    gather = ramp_colour(GATHER, (shown.T * 0.5 + 0.5))     # (SAMPLES, steps, 3)

    yi = (np.arange(FRAME[1]) * SAMPLES // FRAME[1]).clip(0, SAMPLES - 1)
    xi = (np.arange(FRAME[0]) * steps // FRAME[0]).clip(0, steps - 1)
    frames = []
    for s in range(steps):
        img = np.full((FRAME[1], FRAME[0], 3), 0.086, dtype=np.float32)
        have = xi <= s
        img[:, have] = gather[np.ix_(yi, xi[have])]
        frames.append(img)

    # --- panel 3: migrate ---------------------------------------------------
    vx = -bx + (np.arange(N) + 0.5) * (2 * bx / N)
    vy = -by + (np.arange(NY) + 0.5) * (2 * by / NY)
    vz = -bz + (np.arange(N) + 0.5) * (2 * bz / N)
    VX, VY, VZ = np.meshgrid(vx, vy, vz, indexing='ij')

    acc = np.zeros((N, NY, N), dtype=np.float32)
    vols = []
    for i, (x0, y0, z0) in enumerate(shots):
        r = np.sqrt((VX - x0) ** 2 + (VY - y0) ** 2 + (VZ - z0) ** 2)
        idx = np.clip(np.round(2 * r / SPEED / dt).astype(int), 0, SAMPLES - 1)
        # The envelope rather than the wiggle, with the same obliquity weight
        # the recording had and a mild spreading correction, so a reflector
        # sums constructively wherever the travel times agree.
        obliq = np.clip((y0 - VY) / np.maximum(r, 1e-6), 0, 1) ** BEAM
        acc += env[i][idx] * obliq * np.maximum(r, 0.4)

        # Envelope migration piles a broad positive pedestal everywhere, so
        # the slowly varying part is removed along depth - the same
        # background removal GPR processing does before anybody looks at a
        # section. What is left is the reflectors.
        img3 = acc / (i + 1)
        img3 = img3 - gauss1d(img3, 3.2, 1)
        img3 = np.clip(img3, 0, None)
        vols.append(norm(img3, 0.0, float(np.percentile(img3, 99.6))))

    w = Writer(
        'echo', steps,
        ['the shot and the wavefront', 'the gather: shot across, time down',
         'migrated'],
        'shot',
        note='Same pulse-and-timing as a laser scanner, and a different '
             'result: the whole returning waveform is kept rather than only '
             'the first arrival, so the ground under the specimen comes back '
             'too instead of being shadowed by it.',
    )
    w.geometry(shot=[[round(v, 4) for v in s] for s in shots])
    w.meta(grid=GRID, samples=SAMPLES, surface=SURFACE,
           floor=FLOOR, floorRadius=FLOOR_R, dt=round(float(dt), 5))
    w.readout([f'shot {s + 1} of {steps} · {(s + 1) * SAMPLES:,} samples '
               f'recorded'.replace(',', ' ') for s in range(steps)])
    w.frames(frames, cols=6)
    w.volume_series(vols)
    w.save()
