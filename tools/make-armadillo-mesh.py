#!/usr/bin/env python3
"""The mesh on the "making a surface mesh smaller" slide.

Source: the Stanford 3D Scanning Repository's Armadillo model, a laser scan
courtesy of Helmut Kungl - <http://graphics.stanford.edu/data/3Dscanrep/>.
Free to use for non-commercial, educational and scholarly purposes with
credit to the Stanford Computer Graphics Laboratory; not public domain, so
this script downloads it fresh rather than committing the source file.

A PLY from a laser scan already shares vertices between triangles (unlike an
STL, where every triangle carries its own three corners even where they
coincide with a neighbour's), so the cleanup pass below is a no-op safeguard
here rather than a fix - this particular file has 172,974 vertices and
345,944 triangles both before and after it runs. Left in anyway, because a
different scan with unmerged seams would need it, and a decimation script
that silently assumes clean input is a worse default.

Real quadric edge collapse (`open3d.simplify_quadric_decimation`, the same
algorithm as MeshLab's) welds the fine shell texture away first and keeps the
pose - the outstretched claws, the curled snout, the raised ear - to the end,
which is the whole point the slide is making, and is why this is a real
decimation and not the cruder vertex-clustering the deck's other mesh figure
uses.

Every level is centred and scaled once, from the full-resolution mesh, so
swapping between levels in the viewer does not also rescale the object.

    tools/make-armadillo-mesh.py [out-dir]

Writes one binary file per level: a tiny header (vertex count, triangle
count, both uint32), then float32 positions, float32 normals, uint32
triangle indices - read directly into a THREE.BufferGeometry, no loader
needed.
"""
import gzip
import struct
import sys
import urllib.request
from pathlib import Path

import numpy as np
import open3d as o3d

PLY_URL = "http://graphics.stanford.edu/pub/3Dscanrep/armadillo/Armadillo.ply.gz"

# Coarse to fine would make more sense read aloud; the file names sort fine to
# coarse instead, so that level 0 - what a viewer opens first - is the full
# mesh, matching the pyramid's own convention of putting level 0 first. The
# full mesh already has 345,944 triangles, so level 0 needs no decimation.
LEVELS = [345944, 40000, 8000, 2000, 500]


def fetch_ply(dest: Path):
    if not dest.exists():
        print(f"downloading {PLY_URL}")
        gz_path = dest.with_suffix(dest.suffix + ".gz")
        urllib.request.urlretrieve(PLY_URL, gz_path)
        with gzip.open(gz_path, "rb") as src, open(dest, "wb") as out:
            out.write(src.read())
        gz_path.unlink()
    return dest


def clean(mesh):
    mesh.remove_duplicated_vertices()
    mesh.remove_duplicated_triangles()
    mesh.remove_degenerate_triangles()
    return mesh


def write_level(path: Path, mesh):
    mesh.compute_vertex_normals()
    v = np.asarray(mesh.vertices, dtype=np.float32)
    n = np.asarray(mesh.vertex_normals, dtype=np.float32)
    tri = np.asarray(mesh.triangles, dtype=np.uint32)
    with open(path, "wb") as f:
        f.write(struct.pack("<II", len(v), len(tri) * 3))
        f.write(v.tobytes())
        f.write(n.tobytes())
        f.write(tri.tobytes())
    print(f"{path.name}: {len(v)} vertices, {len(tri)} triangles, "
          f"{path.stat().st_size / 1e3:.0f} kB")


def main(out_dir: Path):
    out_dir.mkdir(parents=True, exist_ok=True)
    ply_path = fetch_ply(out_dir / "_source.ply")

    mesh = clean(o3d.io.read_triangle_mesh(str(ply_path)))

    # Centre on the bounding-box middle and scale so the longest axis is 1 -
    # fixed from the full-resolution mesh, shared by every level below, and
    # by tools/make-armadillo-voxels.py so the two scenes agree on scale.
    v = np.asarray(mesh.vertices)
    centre = (v.min(axis=0) + v.max(axis=0)) / 2
    scale = 1.0 / (v.max(axis=0) - v.min(axis=0)).max()
    mesh.translate(-centre)
    mesh.scale(scale, center=(0, 0, 0))

    for i, target in enumerate(LEVELS):
        m = mesh if target >= len(mesh.triangles) else \
            mesh.simplify_quadric_decimation(target_number_of_triangles=target)
        write_level(out_dir / f"level-{i}.bin", m)

    ply_path.unlink()


if __name__ == "__main__":
    main(Path(sys.argv[1]) if len(sys.argv) > 1 else Path("static/data/armadillo"))
