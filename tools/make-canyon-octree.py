#!/usr/bin/env python3
"""An octree over the canyon points, in the shape a point-cloud viewer walks.

Input is static/data/canyon-points.bin, which tools/make-canyon-points.py
writes from USGS 3DEP lidar - the same real points, just partitioned
differently here. That script downloads ~9 MB from AWS; this one does not
touch the network, so the download happens once.

The build is the one EPT, COPC and Potree all do:

  A node covers a cubic box. Lay a GRID^3 lattice over that box and keep one
  point per occupied lattice cell - the one nearest the cell centre, so the
  node's own sample is evenly spaced at its own resolution. Everything not
  kept goes down to whichever of the eight children contains it, and the
  same rule runs there. A node with few enough points left is a leaf and
  keeps all of them.

  So a node's points are the points no ancestor already took. Drawing a node
  *and its ancestors* gives the full density of that region at that depth,
  which is why a viewer can stop at any depth and get a usable picture, and
  why it never has to re-download a coarse point it already has.

    tools/make-canyon-octree.py [in.bin] [out.bin]

Output (little-endian):

    uint32 nodeCount
    uint32 pointCount
    nodeCount x 40-byte records:
        float32 cx, cy, cz, half       box centre and half-side
        uint32  depth
        uint32  first, count           slice of the positions array
        int32   parent                 -1 for the root
        uint32  childStart, childCount contiguous, breadth-first
    float32 x, y, z  x pointCount      grouped by node, in record order
"""
import struct
import sys
from pathlib import Path

import numpy as np

GRID = 14          # lattice cells per axis inside one node
MAX_DEPTH = 6
LEAF_POINTS = 400  # a node with no more than this left stops splitting
SEED = 7


def read_points(path: Path) -> np.ndarray:
    """The tiles make-canyon-points.py wrote, concatenated back into one cloud."""
    buf = path.read_bytes()
    (tile_count,) = struct.unpack_from("<I", buf, 0)
    counts = struct.unpack_from(f"<{tile_count}I", buf, 4)
    offset = 4 + tile_count * 4
    flat = np.frombuffer(buf, dtype="<f4", count=sum(counts) * 3, offset=offset)
    return flat.reshape(-1, 3).astype(np.float64)


def subsample(points: np.ndarray, centre: np.ndarray, half: float):
    """One point per occupied lattice cell, nearest its centre. Returns (kept, rest)."""
    lo = centre - half
    cell = (2.0 * half) / GRID
    idx = np.clip(((points - lo) / cell).astype(np.int64), 0, GRID - 1)
    flat = (idx[:, 0] * GRID + idx[:, 1]) * GRID + idx[:, 2]
    cell_centre = lo + (idx + 0.5) * cell
    d2 = ((points - cell_centre) ** 2).sum(axis=1)
    # Sort by cell, then by distance to that cell's centre: the first row of
    # each cell run is the winner.
    order = np.lexsort((d2, flat))
    ordered_cells = flat[order]
    first_in_cell = np.empty(len(order), dtype=bool)
    first_in_cell[0] = True
    first_in_cell[1:] = ordered_cells[1:] != ordered_cells[:-1]
    keep = order[first_in_cell]
    rest = order[~first_in_cell]
    return keep, rest


class Node:
    __slots__ = ("centre", "half", "depth", "points", "children",
                 "parent", "first", "child_start")

    def __init__(self, centre, half, depth, parent):
        self.centre = centre
        self.half = half
        self.depth = depth
        self.parent = parent
        self.points = None
        self.children = []
        self.first = 0
        self.child_start = 0


def build(points: np.ndarray, centre: np.ndarray, half: float, depth: int,
          parent: "Node | None") -> Node:
    node = Node(centre, half, depth, parent)
    if depth >= MAX_DEPTH or len(points) <= LEAF_POINTS:
        node.points = points
        return node

    keep, rest = subsample(points, centre, half)
    node.points = points[keep]
    remaining = points[rest]
    if not len(remaining):
        return node

    h = half / 2.0
    octant = ((remaining >= centre).astype(np.int64) * np.array([4, 2, 1])).sum(axis=1)
    for o in range(8):
        sel = remaining[octant == o]
        if not len(sel):
            continue
        child_centre = centre + h * np.array([
            1.0 if o & 4 else -1.0, 1.0 if o & 2 else -1.0, 1.0 if o & 1 else -1.0])
        node.children.append(build(sel, child_centre, h, depth + 1, node))
    return node


def breadth_first(root: Node):
    order, queue = [], [root]
    while queue:
        node = queue.pop(0)
        order.append(node)
        queue.extend(node.children)
    return order


def main(in_path: Path, out_path: Path):
    points = read_points(in_path)
    print(f"{len(points)} points in")

    lo, hi = points.min(axis=0), points.max(axis=0)
    centre = (lo + hi) / 2.0
    # A cube, the way every one of these formats defines its root: an octant
    # is only an eighth of the box if the box is cubic to begin with.
    half = float((hi - lo).max()) / 2.0 * 1.001

    root = build(points, centre, half, 0, None)
    order = breadth_first(root)
    index = {id(n): i for i, n in enumerate(order)}

    first = 0
    for node in order:
        node.first = first
        first += len(node.points)
        node.child_start = index[id(node.children[0])] if node.children else 0

    records = bytearray()
    for node in order:
        records += struct.pack(
            "<4f3IiII",
            *(float(v) for v in node.centre), float(node.half),
            node.depth, node.first, len(node.points),
            -1 if node.parent is None else index[id(node.parent)],
            node.child_start, len(node.children),
        )
    positions = np.concatenate([n.points for n in order]).astype("<f4")

    with open(out_path, "wb") as f:
        f.write(struct.pack("<II", len(order), len(positions)))
        f.write(records)
        f.write(positions.tobytes())

    per_depth = {}
    for node in order:
        d = per_depth.setdefault(node.depth, [0, 0])
        d[0] += 1
        d[1] += len(node.points)
    print(f"wrote {out_path}: {len(order)} nodes, {len(positions)} points, "
          f"{out_path.stat().st_size / 1e6:.1f} MB")
    for depth in sorted(per_depth):
        nodes, pts = per_depth[depth]
        print(f"  depth {depth}: {nodes:4d} nodes, {pts:7d} points")


if __name__ == "__main__":
    args = sys.argv[1:]
    main(Path(args[0]) if args else Path("static/data/canyon-points.bin"),
         Path(args[1]) if len(args) > 1 else Path("static/data/canyon-octree.bin"))
