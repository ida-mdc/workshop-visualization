"""The specimen, ported from static/js/viz/shape.js and solid.js.

The acquisition simulations need the same flower the rest of the deck shows,
so this is a deliberate line-by-line port rather than a lookalike - including
the pseudo-random generator and the exact order its values are drawn in, so
the petals land in the same places.

If shape.js changes, this has to change with it. There is a check for that:
`python3 tools/acq/specimen.py --selftest` prints the voxel count and the
specimen's extent, which the JS reports too.
"""

from __future__ import annotations

import math

import numpy as np

MASK = 0xFFFFFFFF
TAU = math.pi * 2

BOUNDS = (1.25, 0.98, 1.25)          # half-extents, x y z


def _imul(a: int, b: int) -> int:
    """JavaScript Math.imul: a 32-bit wrapping multiply."""
    return (a * b) & MASK


def mulberry32(seed: int):
    """Port of rng() in solid.js. Same seed gives the same sequence."""
    state = seed & MASK

    def nxt() -> float:
        nonlocal state
        state = (state + 0x6D2B79F5) & MASK
        t = _imul(state ^ (state >> 15), 1 | state)
        t = (t + _imul(t ^ (t >> 7), 61 | t)) & MASK
        return ((t ^ (t >> 14)) & MASK) / 4294967296.0

    return nxt


def wobble(x, y, z, s):
    """Port of wobble() in solid.js. Works on scalars or numpy arrays."""
    return (0.55 * np.sin(3.7 * x + s) * np.cos(3.1 * y + 1.7 * s)
            + 0.30 * np.sin(5.3 * z - 0.9 * s) * np.cos(4.7 * x + 2.3 * s)
            + 0.15 * np.sin(8.9 * y + 3.1 * s) * np.sin(7.7 * z + s))


def _normalise(v):
    n = math.sqrt(sum(c * c for c in v))
    return tuple(c / n for c in v) if n else (0.0, 0.0, 1.0)


def _cross(a, b):
    return (a[1] * b[2] - a[2] * b[1],
            a[2] * b[0] - a[0] * b[2],
            a[0] * b[1] - a[1] * b[0])


# Surface colours, ported from TINT in shape.js. Each part blends between
# the pair along its own long axis. Photogrammetry is the one simulation that
# needs these: it is the only method here that measures colour, so its
# photographs and its point cloud have to show the specimen's real one.
TINT = {
    'petalOuter': ('#b4384f', '#f2a08f'),
    'petalInner': ('#9d2f4c', '#e8766c'),
    'receptacle': ('#c9853a', '#e8b25e'),
    'stem': ('#4f7f56', '#6d9c63'),
    'stamen': ('#e8b93c', '#f7dd9a'),
}


def _hex(value):
    return np.array([int(value[i:i + 2], 16) / 255 for i in (1, 3, 5)])


class Part:
    """One ellipsoid, cylinder or box, placed in the world.

    `inv` is the inverse placement as a 3x4 affine, applied to whole arrays of
    points at once - the simulations test millions of them.
    """

    def __init__(self, kind, scale, basis, position, amp, seed, tint='petalOuter'):
        self.kind = kind
        self.scale = np.asarray(scale, dtype=np.float64)
        self.amp = float(amp)
        self.seed = float(seed)
        self.position = np.asarray(position, dtype=np.float64)

        # basis columns are the local axes; the full matrix is basis @ diag(scale)
        b = np.asarray(basis, dtype=np.float64)            # 3x3, columns = axes
        m = b @ np.diag(self.scale)
        self.inv_linear = np.linalg.inv(m)
        reach = float(np.hypot.reduce(self.scale) * (1 + self.amp))
        self.bound_sq = reach * reach
        self.tint = tint

    def local(self, pts):
        """World points (N,3) into this part's own frame."""
        return (pts - self.position) @ self.inv_linear.T

    def contains(self, pts):
        """Boolean mask over points (N,3)."""
        d = pts - self.position
        near = np.einsum('ij,ij->i', d, d) <= self.bound_sq
        out = np.zeros(len(pts), dtype=bool)
        if not near.any():
            return out

        v = self.local(pts[near])
        if self.kind == 'cylinder':
            rad = np.hypot(v[:, 0], v[:, 2])
            safe = np.maximum(rad, 1e-9)
            f = 1 + self.amp * wobble(v[:, 0] / safe, v[:, 1], v[:, 2] / safe,
                                      self.seed)
            hit = (np.abs(v[:, 1]) <= 1) & (rad <= f)
        elif self.kind == 'box':
            f = 1 + self.amp * wobble(v[:, 0], v[:, 1], v[:, 2], self.seed)
            hit = ((np.abs(v[:, 0]) <= f) & (np.abs(v[:, 1]) <= f)
                   & (np.abs(v[:, 2]) <= f))
        else:
            length = np.linalg.norm(v, axis=1)
            safe = np.maximum(length, 1e-9)
            f = 1 + self.amp * wobble(v[:, 0] / safe, v[:, 1] / safe,
                                      v[:, 2] / safe, self.seed)
            hit = length <= f

        out[near] = hit
        return out


def _segment(kind, a, b, half, amp, seed, tint='petalOuter', stretch=1.12):
    """Port of segment() in solid.js."""
    along = (b[0] - a[0], b[1] - a[1], b[2] - a[2])
    length = math.sqrt(sum(c * c for c in along)) * 0.5 * stretch
    ex = _normalise(along)
    ez = (-ex[2], 0.0, ex[0])
    if ez[0] ** 2 + ez[2] ** 2 < 1e-12:
        ez = (0.0, 0.0, 1.0)
    ez = _normalise(ez)
    ey = _normalise(_cross(ez, ex))
    ez = _normalise(_cross(ex, ey))

    if kind == 'cylinder':
        basis = list(zip(ez, ex, ey))          # columns ez, ex, ey
        scale = (half['r'], length, half['r'])
    else:
        basis = list(zip(ex, ey, ez))
        scale = (length, half['thick'], half['width'])

    centre = tuple((a[i] + b[i]) * 0.5 for i in range(3))
    return Part(kind, scale, basis, centre, amp, seed, tint)


def _blob(scale, position, amp, seed, tint='petalOuter'):
    return Part('ellipsoid', scale, np.eye(3), position, amp, seed, tint)


def _polar(az, r, h):
    return (math.cos(az) * r, h, math.sin(az) * r)


def build_parts():
    """Port of the PARTS construction in shape.js, in the same draw order."""
    jitter = mulberry32(0x5EED1EAF)

    def spread(amount):
        return (jitter() - 0.5) * 2 * amount

    def petal(spine, half, seed, tint):
        p0, p1, p2 = spine
        return [_segment('ellipsoid', p0, p1, half['base'], 0.17, seed, tint),
                _segment('ellipsoid', p1, p2, half['tip'], 0.20, seed + 11, tint)]

    outer, outer_spines = [], []
    n = 8
    for i in range(n):
        az = (i / n) * TAU + spread(0.10)
        reach = 1.06 + spread(0.10)
        rise = 1 + spread(0.16)
        spine = [_polar(az, 0.13, 0.06),
                 _polar(az, reach * 0.55, 0.27 * rise),
                 _polar(az, reach, 0.20 * rise)]
        outer_spines.append(spine)
        half = {'base': {'width': 0.145 + spread(0.02), 'thick': 0.070},
                'tip': {'width': 0.175 + spread(0.025), 'thick': 0.052}}
        outer += petal(spine, half, 3 + i * 5, 'petalOuter')

    inner, inner_spines = [], []
    n = 7
    for i in range(n):
        az = ((i + 0.5) / n) * TAU + spread(0.12)
        reach = 0.48 + spread(0.06)
        spine = [_polar(az, 0.09, 0.10),
                 _polar(az, reach * 0.60, 0.33),
                 _polar(az, reach, 0.45 + spread(0.05))]
        inner_spines.append(spine)
        half = {'base': {'width': 0.090 + spread(0.012), 'thick': 0.058},
                'tip': {'width': 0.110 + spread(0.015), 'thick': 0.046}}
        inner += petal(spine, half, 101 + i * 7, 'petalInner')

    parts = [
        _segment('cylinder', (0.07, -0.86, 0.03), (0.015, -0.46, 0.0),
                 {'r': 0.068}, 0.10, 61, 'stem'),
        _segment('cylinder', (0.015, -0.46, 0.0), (0, -0.10, 0),
                 {'r': 0.074}, 0.10, 67, 'stem'),
        _blob((0.26, 0.17, 0.26), (0, -0.01, 0), 0.13, 71, 'receptacle'),
    ]
    parts += outer
    parts += inner
    parts.append(_blob((0.080, 0.075, 0.080), (0, 0.17, 0), 0.22, 211,
                       'stamen'))
    for i in range(6):
        a = (i / 6) * TAU + 0.4
        parts.append(_blob((0.052, 0.050, 0.052),
                           (math.cos(a) * 0.135, 0.14 + spread(0.02),
                            math.sin(a) * 0.135),
                           0.24, 221 + i * 3, 'stamen'))
    return parts, outer_spines, inner_spines


PARTS, OUTER_SPINES, INNER_SPINES = build_parts()


def inside(pts):
    """Boolean mask: is each point (N,3) inside the specimen?"""
    out = np.zeros(len(pts), dtype=bool)
    for part in PARTS:
        out |= part.contains(pts)
    return out


def colour(pts):
    """Surface colour at each point, as sRGB in 0..1.

    A point takes the colour of whichever part claims it most strongly -
    the one it is furthest inside - blended along that part's long axis,
    exactly as the mesh's vertex colours are in shape.js. So the stem comes
    out green, the receptacle gold and the petals rose, and a photograph of
    the specimen looks like the specimen.
    """
    best = np.zeros(len(pts), dtype=np.int32)
    score = np.full(len(pts), np.inf)
    blend = np.zeros(len(pts))

    for index, part in enumerate(PARTS):
        v = part.local(pts)
        if part.kind == 'cylinder':
            d = np.maximum(np.abs(v[:, 1]), np.hypot(v[:, 0], v[:, 2]))
            t = v[:, 1]
        else:
            d = np.linalg.norm(v, axis=1)
            t = v[:, 0]
        take = d < score
        score[take] = d[take]
        best[take] = index
        blend[take] = t[take]

    out = np.zeros((len(pts), 3))
    for index, part in enumerate(PARTS):
        mask = best == index
        if not mask.any():
            continue
        lo, hi = (_hex(c) for c in TINT[part.tint])
        f = np.clip((blend[mask] + 1) / 2, 0, 1)[:, None]
        out[mask] = lo * (1 - f) + hi * f
    return out


def intensity(pts):
    """Port of intensityAt: a dense receptacle and a strand up the stem."""
    x, y, z = pts[:, 0], pts[:, 1], pts[:, 2]
    core = np.exp(-((x * x + (y - 0.08) ** 2 + z * z) / 0.09))
    strand = np.exp(-((x * x + z * z) / 0.007))
    return np.minimum(1.0, 0.30 + 0.58 * core + 0.32 * strand)


def grid_points(shape, bounds=BOUNDS):
    """Cell-centre coordinates of a regular grid, as (N,3) and the axes."""
    nx, ny, nz = shape
    bx, by, bz = bounds
    xs = -bx + (np.arange(nx) + 0.5) * (2 * bx / nx)
    ys = -by + (np.arange(ny) + 0.5) * (2 * by / ny)
    zs = -bz + (np.arange(nz) + 0.5) * (2 * bz / nz)
    gx, gy, gz = np.meshgrid(xs, ys, zs, indexing='ij')
    pts = np.stack([gx.ravel(), gy.ravel(), gz.ravel()], axis=1)
    return pts, (xs, ys, zs)


def volume(shape, bounds=BOUNDS, noise=0.0, seed=7):
    """The specimen sampled onto a grid, as float32 in 0..1.

    `noise` adds the background a real detector records in empty space.
    Indexed [x, y, z], matching the JS convention.
    """
    pts, _ = grid_points(shape, bounds)
    vol = np.zeros(len(pts), dtype=np.float32)
    mask = inside(pts)
    vol[mask] = intensity(pts[mask])
    if noise:
        rs = np.random.default_rng(seed)
        bg = 0.03 + noise * rs.random(len(pts)) ** 2
        vol = np.where(mask, vol, bg.astype(np.float32))
    return vol.reshape(shape)


if __name__ == '__main__':
    import sys
    if '--selftest' in sys.argv:
        vol = volume((64, 50, 64))
        occupied = int((vol > 0).sum())
        xs = np.argwhere(vol > 0)
        print(f'parts            {len(PARTS)}')
        print(f'occupied voxels  {occupied} of {vol.size}')
        print(f'index extent     x {xs[:, 0].min()}-{xs[:, 0].max()}  '
              f'y {xs[:, 1].min()}-{xs[:, 1].max()}  '
              f'z {xs[:, 2].min()}-{xs[:, 2].max()}')
        print(f'value range      {vol[vol > 0].min():.3f} - {vol.max():.3f}')
