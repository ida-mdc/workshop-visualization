#!/usr/bin/env python3
"""The point cloud on the "point clouds spend a fixed budget" slide.

Source: USGS 3DEP airborne lidar, public domain, served as Entwine Point
Tiles (the octree format the slide is about) from the AWS Open Data public
bucket - no credentials, no conversion, this already is the real thing:

    https://usgs-lidar-public.s3.us-west-2.amazonaws.com/AZ_GrandCanyonNP_1_2019/

That project alone is 22.4 billion points. This script fetches only the
coarse end of its octree - every node at depth 0 to 3, about 700,000 points
across ~28 km x 21 km of the park - which is already enough to find a
dramatic slice in, and crops to one: a tributary canyon system with 1.85 km
of real relief, chosen by searching the fetched extent for the fully-covered
window with the most local elevation variance. The box below is that search's
answer, hardcoded so re-running this script is deterministic.

Two things get baked in here rather than left to the viewer:

  BUCKETING. Real coverage is not a neat grid - some tiles get thousands of
  points, others a few hundred. Each tile keeps whatever real points its
  patch of ground actually returned, in a shuffled order fixed once here, so
  the scene's own logic - grab the first n of a tile as a sample of it - works
  on real, uneven data instead of the equal-count tiles synthetic terrain
  would give for free.

  VERTICAL EXAGGERATION, 3x. The real canyon is about 8% as deep as this
  window is wide, which reads as almost flat from the oblique angle a viewer
  actually stands at. 3x is enough to see it and small enough to still be
  the same shape - the honest number to be upfront about, not to hide.

    tools/make-canyon-points.py [out.bin]

Output: uint32 tile count, that many uint32 point counts, then one
Float32Array of x, y, z per point, tiles in row-major order, each tile's
points already shuffled. x and z are ground position, y is elevation - both
already normalized so the scene does not need to know real-world units.
"""
import io
import struct
import sys
import urllib.request
from pathlib import Path

import laspy
import numpy as np

BUCKET = "https://usgs-lidar-public.s3.us-west-2.amazonaws.com"
PROJECT = "AZ_GrandCanyonNP_1_2019"
MAX_DEPTH = 3                # 0..3: ~107 node files, ~700k points, ~9 MB

# Found by gridding the depth-0..3 extent and taking the fully-covered 30%
# window with the highest std(elevation). EPSG:3857 (Web Mercator) metres,
# matching this dataset's ept.json.
BOX = (-12482530.4, 4315411.3, -12458988.0, 4332493.4)

TILES = 5                    # per axis, matching the scene's grid
EXTENT = 3.0                 # world units the scene expects the ground to span
EXAGGERATION = 3.0           # see VERTICAL EXAGGERATION above
NOISE_CLASSES = (7, 18)      # LAS classification: low point (noise), high noise


def fetch(url: str) -> bytes:
    with urllib.request.urlopen(url, timeout=60) as r:
        return r.read()


def node_keys(max_depth: int):
    import json
    hierarchy = json.loads(fetch(f"{BUCKET}/{PROJECT}/ept-hierarchy/0-0-0-0.json"))
    return [k for k in hierarchy if int(k.split("-")[0]) <= max_depth]


def download_points(max_depth: int):
    xs, ys, zs, cs = [], [], [], []
    keys = node_keys(max_depth)
    print(f"{len(keys)} EPT nodes to fetch")
    for i, key in enumerate(keys):
        data = fetch(f"{BUCKET}/{PROJECT}/ept-data/{key}.laz")
        las = laspy.read(io.BytesIO(data))
        xs.append(np.asarray(las.x)); ys.append(np.asarray(las.y))
        zs.append(np.asarray(las.z)); cs.append(np.asarray(las.classification))
        if (i + 1) % 20 == 0:
            print(f"  {i + 1}/{len(keys)}")
    return (np.concatenate(xs), np.concatenate(ys),
            np.concatenate(zs), np.concatenate(cs))


def rng(seed):
    """Same tiny xorshift the scene used to use, for a shuffle order that
    does not depend on Python's own RNG staying the same across versions."""
    s = seed
    while True:
        s = (s + 0x6d2b79f5) & 0xffffffff
        t = s ^ (s >> 15)
        t = (t * (1 | s)) & 0xffffffff
        t2 = t ^ (t >> 7)
        t = (t + (t2 * (61 | t)) & 0xffffffff) ^ t
        t &= 0xffffffff
        yield ((t ^ (t >> 14)) & 0xffffffff)


def shuffled(n, seed):
    order = np.arange(n)
    g = rng(seed)
    for i in range(n - 1, 0, -1):
        j = next(g) % (i + 1)
        order[i], order[j] = order[j], order[i]
    return order


def main(out_path: Path):
    x, y, z, c = download_points(MAX_DEPTH)
    keep = ~np.isin(c, NOISE_CLASSES)
    x, y, z = x[keep], y[keep], z[keep]

    x0, y0, x1, y1 = BOX
    sel = (x >= x0) & (x <= x1) & (y >= y0) & (y <= y1)
    x, y, z = x[sel], y[sel], z[sel]
    print(f"{len(x)} points in the box, {z.max() - z.min():.0f} m of relief")

    # World -> scene: ground plane centred at the origin and scaled to EXTENT;
    # elevation through the same horizontal scale, then exaggerated.
    scale = EXTENT / max(x1 - x0, y1 - y0)
    sx = (x - (x0 + x1) / 2) * scale
    sz = (y - (y0 + y1) / 2) * scale
    sy = (z - z.mean()) * scale * EXAGGERATION

    tile_size = EXTENT / TILES
    half = EXTENT / 2
    tx = np.clip(((sx + half) / tile_size).astype(int), 0, TILES - 1)
    tz = np.clip(((sz + half) / tile_size).astype(int), 0, TILES - 1)

    tiles = []
    for row in range(TILES):
        for col in range(TILES):
            mask = (tx == col) & (tz == row)
            order = shuffled(int(mask.sum()), seed=1000 + row * 37 + col * 101)
            idx = np.nonzero(mask)[0][order]
            tiles.append(np.stack([sx[idx], sy[idx], sz[idx]], axis=1).astype(np.float32))

    with open(out_path, "wb") as f:
        f.write(struct.pack("<I", len(tiles)))
        for t in tiles:
            f.write(struct.pack("<I", len(t)))
        for t in tiles:
            f.write(t.tobytes())

    counts = [len(t) for t in tiles]
    print(f"wrote {out_path}: {sum(counts)} points over {len(tiles)} tiles "
          f"({min(counts)}..{max(counts)} per tile)")


if __name__ == "__main__":
    main(Path(sys.argv[1]) if len(sys.argv) > 1 else Path("static/data/canyon-points.bin"))
