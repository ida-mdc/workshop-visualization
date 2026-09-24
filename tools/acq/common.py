"""Shared machinery for the acquisition simulations.

Every modality is simulated over a fixed number of steps, and every step
produces all three panels at once: where the instrument is, what it recorded,
and what the dataset looks like so far. That is the point - the panels cannot
disagree with each other, because they come out of the same loop.

What gets written per modality, into static/data/acq/<name>/:

  manifest.json   steps, labels, per-step instrument geometry, readouts
  frames.png      atlas of the panel-2 images, one tile per step
  volume.png      atlas of z-slices of the assembled volume (panel 3)
  order.png       for progressively revealed volumes: the step each voxel
                  first appears in (255 = never)
  points.bin      for point datasets: quantised xyz, colour, and first step

Images rather than raw arrays because PNG compresses losslessly and is served
correctly by any static host without content-encoding negotiation.
"""

from __future__ import annotations

import json
import os

import numpy as np
from PIL import Image

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT_ROOT = os.path.join(REPO, 'static', 'data', 'acq')


# --- small numerics the simulations need, without scipy ---------------------

def gauss1d(a, sigma, axis):
    """Gaussian blur along one axis. Separable, so callers chain per-axis."""
    if sigma <= 0:
        return a
    r = max(1, int(round(3 * sigma)))
    k = np.exp(-0.5 * (np.arange(-r, r + 1) / sigma) ** 2)
    k /= k.sum()
    pad = [(0, 0)] * a.ndim
    pad[axis] = (r, r)
    ap = np.pad(a, pad, mode='edge')
    out = np.zeros(a.shape, dtype=np.float32)
    for i, w in enumerate(k):
        sl = [slice(None)] * a.ndim
        sl[axis] = slice(i, i + a.shape[axis])
        out += np.float32(w) * ap[tuple(sl)]
    return out


def gauss(a, sigmas):
    """Anisotropic Gaussian blur: one sigma per axis, in voxels."""
    for axis, s in enumerate(sigmas):
        a = gauss1d(a, s, axis)
    return a


def resample2d(img, dx, dy, angle):
    """Rotate about the centre then shift, bilinear, zero outside.

    Used to put a physical section down on the slide at the angle and offset
    the handling actually gave it.
    """
    h, w = img.shape
    yy, xx = np.meshgrid(np.arange(h) - (h - 1) / 2,
                         np.arange(w) - (w - 1) / 2, indexing='ij')
    ca, sa = np.cos(-angle), np.sin(-angle)
    sx = (xx - dx) * ca - (yy - dy) * sa + (w - 1) / 2
    sy = (xx - dx) * sa + (yy - dy) * ca + (h - 1) / 2
    x0 = np.floor(sx).astype(np.int64)
    y0 = np.floor(sy).astype(np.int64)
    tx, ty = sx - x0, sy - y0
    ok = (x0 >= 0) & (x0 < w - 1) & (y0 >= 0) & (y0 < h - 1)
    xc = np.clip(x0, 0, w - 2)
    yc = np.clip(y0, 0, h - 2)
    out = ((img[yc, xc] * (1 - tx) + img[yc, xc + 1] * tx) * (1 - ty)
           + (img[yc + 1, xc] * (1 - tx) + img[yc + 1, xc + 1] * tx) * ty)
    return np.where(ok, out, 0.0).astype(np.float32)


def norm(a, lo=None, hi=None):
    """Scale to 0..1 using the given window, or the array's own range."""
    lo = float(a.min()) if lo is None else lo
    hi = float(a.max()) if hi is None else hi
    if hi - lo < 1e-9:
        return np.zeros_like(a, dtype=np.float32)
    return np.clip((a - lo) / (hi - lo), 0, 1).astype(np.float32)


def u8(a):
    return np.clip(np.asarray(a) * 255.0 + 0.5, 0, 255).astype(np.uint8)


# --- writing ----------------------------------------------------------------

def _atlas(tiles, cols):
    """Stack equally sized tiles into a grid image. Tiles are (h, w[, c])."""
    n = len(tiles)
    rows = (n + cols - 1) // cols
    h, w = tiles[0].shape[:2]
    chan = tiles[0].shape[2:] 
    sheet = np.zeros((rows * h, cols * w) + chan, dtype=np.uint8)
    for i, t in enumerate(tiles):
        r, c = divmod(i, cols)
        sheet[r * h:(r + 1) * h, c * w:(c + 1) * w] = t
    return sheet


class Writer:
    """Collects one modality's output and writes it in one go."""

    def __init__(self, name, steps, labels, time_label, note=''):
        self.name = name
        self.dir = os.path.join(OUT_ROOT, name)
        os.makedirs(self.dir, exist_ok=True)
        self.man = {
            'name': name,
            'steps': int(steps),
            'labels': list(labels),
            'timeLabel': time_label,
            'note': note,
            'geometry': {},
            'readout': [],
        }

    def geometry(self, **arrays):
        """Per-step instrument state, so panel 1 replays the simulation too."""
        for k, v in arrays.items():
            self.man['geometry'][k] = np.asarray(v).round(5).tolist()

    def readout(self, lines):
        self.man['readout'] = list(lines)

    def meta(self, **kw):
        self.man.update(kw)

    def frames(self, imgs, cols=6):
        """Panel 2: one image per step. Each (h, w) grey or (h, w, 3) colour."""
        tiles = [u8(im) for im in imgs]
        sheet = _atlas(tiles, cols)
        h, w = tiles[0].shape[:2]
        Image.fromarray(sheet).save(os.path.join(self.dir, 'frames.png'))
        self.man['frames'] = {
            'file': 'frames.png', 'cols': cols,
            'tile': [int(w), int(h)],
            'channels': 1 if tiles[0].ndim == 2 else 3,
        }

    def volume(self, vol, order=None, cols=None, variants=None):
        """Panel 3: one volume, indexed [x, y, z], sliced along z.

        `order` gives the step each voxel first appears in, so the JS can
        reveal the dataset as it was acquired without storing every state.
        """
        nx, ny, nz = vol.shape
        cols = cols or int(np.ceil(np.sqrt(nz)))

        def sheet(v, path):
            Image.fromarray(_atlas([u8(v[:, :, k]).T for k in range(nz)],
                                   cols)).save(os.path.join(self.dir, path))

        sheet(vol, 'volume.png')
        entry = {'kind': 'volume', 'file': 'volume.png',
                 'shape': [nx, ny, nz], 'cols': cols}
        if variants:
            entry['variants'] = {}
            for label, alt in variants.items():
                sheet(alt, f'volume-{label}.png')
                entry['variants'][label] = f'volume-{label}.png'
        if order is not None:
            o = np.clip(np.asarray(order), 0, 255).astype(np.uint8)
            tiles = [o[:, :, k].T for k in range(nz)]
            Image.fromarray(_atlas(tiles, cols)).save(
                os.path.join(self.dir, 'order.png'))
            entry['order'] = 'order.png'
        self.man['panel3'] = entry

    def volume_series(self, vols, cols=None, variants=None):
        """Panel 3 when the whole dataset changes every step, as it does for a
        reconstruction: one volume per step, concatenated into one atlas.

        `variants` is an optional {label: [volumes]} for alternatives the
        viewer can switch between - filtered against unfiltered, say.
        """
        nx, ny, nz = vols[0].shape
        cols = cols or int(np.ceil(np.sqrt(nz)))
        per = int(np.ceil(nz / cols)) * cols

        def sheet(series, path):
            tiles = []
            for vol in series:
                tiles += [u8(vol[:, :, k]).T for k in range(nz)]
                tiles += [np.zeros((ny, nx), np.uint8)] * (per - nz)
            Image.fromarray(_atlas(tiles, cols)).save(
                os.path.join(self.dir, path))

        sheet(vols, 'volume.png')
        self.man['panel3'] = {
            'kind': 'volume-series', 'file': 'volume.png',
            'shape': [nx, ny, nz], 'cols': cols, 'tilesPerVolume': per,
        }
        if variants:
            files = {}
            for label, series in variants.items():
                name = f'volume-{label}.png'
                sheet(series, name)
                files[label] = name
            self.man['panel3']['variants'] = files

    def field_series(self, fields, cols=8):
        """Panel 3 as a height field, one per step.

        For results that are a surface rather than a volume - a recovered
        phase, a projected thickness - where drawing voxels would claim depth
        information the measurement does not have.
        """
        tiles = [u8(f.T[::-1]) for f in fields]
        h, wd = tiles[0].shape
        Image.fromarray(_atlas(tiles, cols)).save(
            os.path.join(self.dir, 'field.png'))
        self.man['panel3'] = {
            'kind': 'field-series', 'file': 'field.png',
            'tile': [int(wd), int(h)], 'cols': cols,
        }

    def points(self, xyz, rgb, step, bounds):
        """Panel 3 as points: quantised to 16 bits over the given half-extents.

        Record layout, little-endian: 3 x int16 position, 3 x uint8 colour,
        1 x uint8 first step, 1 byte padding = 12 bytes.
        """
        n = len(xyz)
        b = np.asarray(bounds, dtype=np.float64)
        q = np.clip(np.asarray(xyz) / b, -1, 1)
        buf = np.zeros((n, 12), dtype=np.uint8)
        pos = (q * 32767).astype('<i2')
        buf[:, 0:6] = pos.view(np.uint8).reshape(n, 6)
        buf[:, 6:9] = u8(rgb)
        buf[:, 9] = np.clip(step, 0, 255).astype(np.uint8)
        with open(os.path.join(self.dir, 'points.bin'), 'wb') as f:
            f.write(buf.tobytes())
        self.man['panel3'] = {
            'kind': 'points', 'file': 'points.bin',
            'count': int(n), 'bounds': [float(v) for v in b], 'stride': 12,
        }

    def save(self):
        path = os.path.join(self.dir, 'manifest.json')
        with open(path, 'w') as f:
            json.dump(self.man, f, separators=(',', ':'))
        total = sum(os.path.getsize(os.path.join(self.dir, f))
                    for f in os.listdir(self.dir))
        print(f'  {self.name:16s} {self.man["steps"]:3d} steps  '
              f'{total / 1024:7.0f} KB')


# --- ray marching -----------------------------------------------------------

class Field:
    """A sampled volume you can look up and shoot rays at.

    Everything that measures the specimen from outside - cameras, laser
    scanners, sonar - works against one of these, so they all agree about
    where the surface is and what occludes what.
    """

    def __init__(self, vol, bounds, level=0.25):
        self.vol = np.ascontiguousarray(vol, dtype=np.float32)
        self.bounds = np.asarray(bounds, dtype=np.float64)
        self.level = level
        self.shape = np.array(vol.shape)

    def at(self, pts):
        """Trilinear lookup at world points (N, 3). Outside reads as zero."""
        f = (pts + self.bounds) / (2 * self.bounds) * self.shape - 0.5
        i0 = np.floor(f).astype(np.int64)
        t = (f - i0).astype(np.float32)
        ok = np.all((i0 >= 0) & (i0 < self.shape - 1), axis=1)
        c = np.clip(i0, 0, self.shape - 2)
        x, y, z = c[:, 0], c[:, 1], c[:, 2]
        tx, ty, tz = t[:, 0], t[:, 1], t[:, 2]
        v = self.vol
        out = (
            ((v[x, y, z] * (1 - tx) + v[x + 1, y, z] * tx) * (1 - ty)
             + (v[x, y + 1, z] * (1 - tx) + v[x + 1, y + 1, z] * tx) * ty)
            * (1 - tz)
            + ((v[x, y, z + 1] * (1 - tx) + v[x + 1, y, z + 1] * tx) * (1 - ty)
               + (v[x, y + 1, z + 1] * (1 - tx)
                  + v[x + 1, y + 1, z + 1] * tx) * ty) * tz)
        return np.where(ok, out, 0.0).astype(np.float32)

    def normal(self, pts, h=0.02):
        """Outward surface normal from the gradient, for shading."""
        g = []
        for axis in range(3):
            d = np.zeros(3)
            d[axis] = h
            g.append(self.at(pts - d) - self.at(pts + d))
        n = np.stack(g, axis=1)
        return n / np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-9)

    def march(self, origin, dirs, near=0.0, far=6.0, step=0.012):
        """First crossing of the iso level along each ray.

        Returns (distance, hit). Distance is -1 where nothing was hit, which
        is the honest answer for a laser pulse that never came back.
        """
        n = len(dirs)
        origin = np.broadcast_to(np.asarray(origin, dtype=np.float64), (n, 3))
        dist = np.full(n, -1.0)
        live = np.ones(n, dtype=bool)
        t = np.full(n, float(near))
        while t.min() < far and live.any():
            idx = np.nonzero(live)[0]
            p = origin[idx] + dirs[idx] * t[idx][:, None]
            hit = self.at(p) >= self.level
            done = idx[hit]
            dist[done] = t[done]
            live[done] = False
            t[idx] += step
            live[idx[t[idx] > far]] = False
        return dist, dist >= 0

    def occluded(self, pts, target, step=0.03, skip=0.06):
        """Is the straight line from each point to `target` blocked?

        `skip` steps off the surface first, so a point does not occlude
        itself. This is what makes a view count as a view.
        """
        target = np.asarray(target, dtype=np.float64)
        to = target[None, :] - pts
        dist = np.linalg.norm(to, axis=1)
        dirs = to / np.maximum(dist, 1e-9)[:, None]
        blocked = np.zeros(len(pts), dtype=bool)
        t = np.full(len(pts), skip)
        while True:
            live = (~blocked) & (t < dist)
            if not live.any():
                break
            idx = np.nonzero(live)[0]
            p = pts[idx] + dirs[idx] * t[idx][:, None]
            blocked[idx[self.at(p) >= self.level]] = True
            t[idx] += step
        return blocked


def surface_points(field, count, seed=3):
    """Points on the iso surface: boundary voxels, nudged onto the level set."""
    nx, ny, nz = field.vol.shape
    solid = field.vol >= field.level
    idx = np.stack(np.nonzero(solid & ~_erode(solid)), axis=1)
    rs = np.random.default_rng(seed)
    if len(idx) > count:
        idx = idx[rs.choice(len(idx), count, replace=False)]
    b = field.bounds
    pts = (idx + 0.5) / np.array([nx, ny, nz]) * 2 * b - b
    # settle onto the level set along the gradient
    for _ in range(3):
        v = field.at(pts)
        n = field.normal(pts)
        pts = pts + n * ((v - field.level) * 0.35)[:, None]
    return pts


def _erode(solid):
    out = solid.copy()
    for axis in range(3):
        for sh in (1, -1):
            out &= np.roll(solid, sh, axis=axis)
    return out


def ramp_colour(stops, t):
    """Sample a list of hex colours at t in 0..1. Returns (..., 3) floats."""
    cols = np.array([[int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
                     for h in stops])
    t = np.clip(np.asarray(t, dtype=np.float32), 0, 1) * (len(cols) - 1)
    i0 = np.clip(np.floor(t).astype(int), 0, len(cols) - 2)
    f = (t - i0)[..., None]
    return (cols[i0] * (1 - f) + cols[i0 + 1] * f).astype(np.float32)


def envelope(x, axis=-1):
    """Instantaneous amplitude via the analytic signal.

    Echo data is oscillatory - a reflector shows up as a wavelet with
    negative lobes - so the amplitude envelope is what gets displayed and
    migrated. Standard practice for GPR and sonar, and it is why those
    images look like bands rather than wiggles.
    """
    n = x.shape[axis]
    spec = np.fft.fft(x, axis=axis)
    h = np.zeros(n)
    h[0] = 1
    h[1:(n + 1) // 2] = 2
    if n % 2 == 0:
        h[n // 2] = 1
    shape = [1] * x.ndim
    shape[axis] = n
    return np.abs(np.fft.ifft(spec * h.reshape(shape), axis=axis))
