#!/usr/bin/env python3
"""The occupancy grid behind the "what an octree is" slide.

Source: the same Stanford 3D Scanning Repository Armadillo used by
tools/make-armadillo-mesh.py - see that script's docstring for licensing.

The point being made on that slide is that an octree pays off for *sparse*
data: a mesh surface has almost no volume, so only a thin shell of space
around it is ever occupied, and the octree's empty cells stay coarse. A
thresholded CT volume is the wrong data for that demo - a dense scan fills
most of its bounding box, which is exactly the case the deck says gets a
chunk grid instead (see the "Dense grids and hierarchical trees" slide).

So this voxelizes the Armadillo's real triangle surface - not its interior -
at a fixed 64^3 resolution (open3d's own `create_from_triangle_mesh`, a real
surface/triangle-box intersection test, not a stand-in): about 4% of the
cube ends up occupied, a thin shell hugging the pose. The three.js scene
then builds an actual octree on top of that grid at build/render time - this
script's only job is to decide, once and for real, which of the 64^3 cells
the surface touches.

Centred and scaled exactly as tools/make-armadillo-mesh.py does, over the
same root cube the octree scene recurses into, so a grid cell at depth 6
lines up exactly with one voxel here.

    tools/make-armadillo-voxels.py [out.bin]

Output: uint32 grid resolution N, then N^3 bits (padded to whole bytes),
1 = the surface touches that cell, x the slowest-changing axis, z fastest.
"""
import struct
import sys
import urllib.request
from pathlib import Path

import numpy as np
import open3d as o3d

PLY_URL = "http://graphics.stanford.edu/pub/3Dscanrep/armadillo/Armadillo.ply.gz"
N = 64  # matches MAX_DEPTH = 6 in octree-build.js: 2**6 == 64


def fetch_ply(dest: Path):
    if not dest.exists():
        import gzip
        print(f"downloading {PLY_URL}")
        gz_path = dest.with_suffix(dest.suffix + ".gz")
        urllib.request.urlretrieve(PLY_URL, gz_path)
        with gzip.open(gz_path, "rb") as src, open(dest, "wb") as out:
            out.write(src.read())
        gz_path.unlink()
    return dest


def main(out_path: Path):
    import tempfile
    with tempfile.TemporaryDirectory() as tmp:
        ply_path = fetch_ply(Path(tmp) / "_source.ply")
        mesh = o3d.io.read_triangle_mesh(str(ply_path))

    mesh.remove_duplicated_vertices()
    mesh.remove_duplicated_triangles()
    mesh.remove_degenerate_triangles()

    v = np.asarray(mesh.vertices)
    centre = (v.min(axis=0) + v.max(axis=0)) / 2
    scale = 1.0 / (v.max(axis=0) - v.min(axis=0)).max()
    mesh.translate(-centre)
    mesh.scale(scale, center=(0, 0, 0))

    voxel_size = 1.0 / N
    vg = o3d.geometry.VoxelGrid.create_from_triangle_mesh_within_bounds(
        mesh, voxel_size=voxel_size,
        min_bound=(-0.5, -0.5, -0.5), max_bound=(0.5, 0.5, 0.5))
    idx = np.clip(np.array([voxel.grid_index for voxel in vg.get_voxels()]), 0, N - 1)

    grid = np.zeros((N, N, N), dtype=bool)
    grid[idx[:, 0], idx[:, 1], idx[:, 2]] = True
    print(f"{grid.sum()} of {N**3} cells occupied ({100 * grid.sum() / N**3:.1f}%)")

    packed = np.packbits(grid.reshape(-1))
    with open(out_path, "wb") as f:
        f.write(struct.pack("<I", N))
        f.write(packed.tobytes())
    print(f"wrote {out_path}: {out_path.stat().st_size} bytes")


if __name__ == "__main__":
    main(Path(sys.argv[1]) if len(sys.argv) > 1 else Path("static/data/armadillo-voxels.bin"))
