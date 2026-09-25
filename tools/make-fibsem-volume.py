#!/usr/bin/env python3
"""Pull a block of FIB-SEM out of OpenOrganelle, for the "no background" slide.

    tools/make-fibsem-volume.py [out-dir] [across]

The honest example of a volume with nothing to threshold away.

The frog is a specimen sitting in air: three quarters of its voxels are exactly
zero, so one number separates animal from background. The tongue block has no
air in it, but it still has strong density contrast - glands, ducts and fibre
bundles are all distinguishable by value, so a transfer function still has
something to work with.

Resin-embedded, heavy-metal-stained tissue imaged by FIB-SEM has neither. Every
voxel is sample, and the values sit in one narrow band: in the block this
writes, nothing is zero, the minimum is about 1255 and the bulk lives between
6000 and 14000 of a 16-bit range. Membranes, granules and mitochondria overlap
in value. There is no threshold that gives you "the cell", because there is
nothing in frame that is not the cell.

## Where it comes from

`jrc_mus-pancreas-1` on OpenOrganelle: isolated murine pancreatic islets
treated with high glucose, FIB-SEM at 4 x 4 x 3.4 nm.

    Xu CS, Pang S, Bennett D, Mueller A, Solimena M, Hess H (2020).
    doi:10.25378/janelia.13114499  -  CC BY 4.0
    https://openorganelle.janelia.org/datasets/jrc_mus-pancreas-1

Same collaboration as the beta cell work this workshop already cites - Müller
et al., J Cell Biol 220(2):e202010039 (2021), doi:10.1083/jcb.202010039 - which
distributes its own analysed cells with segmentation masks via
https://betaseg.github.io/ if you want labels rather than raw EM.

## Why it streams instead of downloading

At full resolution the dataset is 7500 x 5000 x 7312 voxels of uint16: 548 GB.
This script never downloads it. The data is stored as an N5 multiscale pyramid
in 96^3 chunks on S3, so a 256^3 box at the third level costs 36 chunks and a
few seconds - which is the whole argument of the large-data session, run for
real on the way to making a slide.

Only the standard library plus numpy is needed; the N5 reader below is forty
lines because that is all the format is.
"""
import gzip
import json
import pathlib
import struct
import sys
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor

import numpy as np

BASE = ("https://janelia-cosem-datasets.s3.amazonaws.com"
        "/jrc_mus-pancreas-1/jrc_mus-pancreas-1.n5")
ARRAY = "em/fibsem-uint16"

OUT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "static/data")
ACROSS = int(sys.argv[2]) if len(sys.argv) > 2 else 160

# Pyramid level to read. s2 is 16 x 16 x 13.6 nm, where a secretory granule is
# about 20 voxels across and a mitochondrion about 30 - enough to read the
# organelles without pulling the finest level.
LEVEL = "s2"

# Source box, in voxels at that level, taken from the middle of the volume.
BOX = 256

# Display window, as percentiles. Unlike the frog there is no air peak to
# window from, and unlike the tongue there is no low tail to protect: the
# histogram is one narrow mode, so this just spreads it over the 8 bits.
LO_PCT = 0.1
HI_PCT = 99.9


def _get(url):
    try:
        return urllib.request.urlopen(url, timeout=180).read()
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None          # a missing chunk is all zeros, per the spec
        raise


def attributes(path):
    return json.loads(_get(f"{BASE}/{path}/attributes.json"))


def read_chunk(path, idx, dtype):
    raw = _get(f"{BASE}/{path}/{'/'.join(map(str, idx))}")
    if raw is None:
        return None
    _mode, ndim = struct.unpack(">HH", raw[:4])
    dims = struct.unpack(f">{ndim}I", raw[4:4 + 4 * ndim])
    body = gzip.decompress(raw[4 + 4 * ndim:])
    # N5 stores each chunk column-major over its own dimensions.
    return np.frombuffer(body, dtype=dtype).reshape(dims, order="F")


def read_box(path, start, shape):
    """Fetch a box. `start` and `shape` are in N5 order, axis 0 fastest."""
    a = attributes(path)
    cs = a["blockSize"]
    dtype = np.dtype(a["dataType"]).newbyteorder(">")
    out = np.zeros(shape, dtype=a["dataType"])
    stop = [start[i] + shape[i] for i in range(3)]
    grid = [range(start[i] // cs[i], (stop[i] - 1) // cs[i] + 1) for i in range(3)]
    todo = [(i, j, k) for i in grid[0] for j in grid[1] for k in grid[2]]

    with ThreadPoolExecutor(16) as pool:
        for idx, chunk in pool.map(lambda x: (x, read_chunk(path, x, dtype)), todo):
            if chunk is None:
                continue
            org = [idx[i] * cs[i] for i in range(3)]
            lo = [max(org[i], start[i]) for i in range(3)]
            hi = [min(org[i] + chunk.shape[i], stop[i]) for i in range(3)]
            if any(hi[i] <= lo[i] for i in range(3)):
                continue
            src = tuple(slice(lo[i] - org[i], hi[i] - org[i]) for i in range(3))
            dst = tuple(slice(lo[i] - start[i], hi[i] - start[i]) for i in range(3))
            out[dst] = chunk[src]
    return out, len(todo)


def main():
    path = f"{ARRAY}/{LEVEL}"
    a = attributes(path)
    dims = a["dimensions"]
    res = a["pixelResolution"]["dimensions"]
    full = attributes(f"{ARRAY}/s0")["dimensions"]
    print(f"{LEVEL}: {dims} at {res} nm "
          f"(s0 is {full}, {np.prod(full) * 2 / 1e9:.0f} GB)")

    start = [dims[i] // 2 - BOX // 2 for i in range(3)]
    print(f"reading {BOX}^3 at {start}")
    box, nchunks = read_box(path, start, [BOX] * 3)
    print(f"  {nchunks} chunks, {box.nbytes / 1e6:.1f} MB")

    # N5 gives x fastest; the texture wants (z, y, x).
    vol = box.transpose(2, 1, 0).astype(np.float32)

    n = ACROSS
    if n != BOX:
        # Box-average down, an integer factor at a time where possible.
        f = BOX // n
        if BOX % n == 0:
            vol = vol.reshape(n, f, n, f, n, f).mean(axis=(1, 3, 5))
        else:
            idx = [np.linspace(0, BOX, n + 1).astype(int) for _ in range(3)]
            out = np.zeros((n, n, n), np.float32)
            for i in range(n):
                for j in range(n):
                    for k in range(n):
                        out[i, j, k] = vol[idx[0][i]:max(idx[0][i] + 1, idx[0][i + 1]),
                                           idx[1][j]:max(idx[1][j] + 1, idx[1][j + 1]),
                                           idx[2][k]:max(idx[2][k] + 1, idx[2][k + 1])].mean()
            vol = out

    lo = float(np.percentile(vol, LO_PCT))
    hi = float(np.percentile(vol, HI_PCT))
    print(f"window [{lo:.0f}, {hi:.0f}] of a 16-bit range; "
          f"source min {box.min()}, max {box.max()}")
    scaled = np.clip((vol - lo) / max(hi - lo, 1e-6), 0, 1)
    data = (scaled * 255).round().astype(np.uint8)
    print(f"voxels at exactly zero after quantising: {float((data == 0).mean()):.6f}")

    OUT.mkdir(parents=True, exist_ok=True)
    name = f"fibsem-{n}x{n}x{n}.raw"
    (OUT / name).write_bytes(data.ravel(order="C").tobytes())
    nm = BOX * res[0] / 1000
    print(f"{OUT / name}: {n}x{n}x{n}, {data.nbytes / 1e6:.2f} MB, "
          f"{nm:.2f} um on a side")


if __name__ == "__main__":
    main()
