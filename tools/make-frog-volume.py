#!/usr/bin/env python3
"""Turn the published frog micro-CT into a volume the slides can stream.

    tools/make-frog-volume.py path/to/Ceratophrys_ornata_frogCT.zip [out-dir] [across]

The source is an iodine-stained micro-CT of an Argentine horned frog
(Ceratophrys ornata), 1936 x 1936 x 1476 voxels at 26.68 um isotropic, 1.4 GB
of BMP slices. Kleinteich & Gorb, "Frog tongue acts as muscle-powered adhesive
tape", CC0:

    https://doi.org/10.5061/dryad.066mr

It is the HEAD and forelimbs, not the whole animal. Dryad calls the file "a
micro-CT scan of the head of a 70mm female", and the volume does stop at the
shoulders - Ceratophrys are mostly head, which is why it reads as a whole frog.
The same deposit also has the tongue (165 MB) and a piece of tongue tissue
(3.6 GB); there is no whole-body scan in it.

Everything below DOWNSAMPLES the published stack. Nothing here crops it: every
slice is read and box-averaged, so the output holds the full field of view.

Stained, which is the reason it is this scan and not a plain CT. A plain CT of
an animal is a skeleton in a fog; the iodine brings the muscle, gut and eyes up
with it, so one volume holds skin, soft tissue and bone as three separate
bands of value - which is exactly what the transfer function slides need
something to point at.

The deck cannot stream 1.4 GB, and nothing in a browser reads a BMP stack. So:
downsample to an isotropic grid, window to 8 bit, and write a flat array that
fetch() can hand straight to a Data3DTexture. The shape is in the filename
because the loader has to know it and a second file to keep in sync is a
second file to get wrong.

Axes are rearranged on the way out. The scan is sliced dorsal to ventral, so
its stack axis is the frog's thickness; the deck wants that axis pointing up,
because a frog sitting flat in a box is a frog. Output is therefore

    x   across the animal          1936 px
    y   dorsoventral, dorsal up    1476 slices, reversed
    z   nose to tail               1936 px

Re-run it if the target size changes; the result is committed, so the site
build does not depend on Python or on the 1.4 GB original.
"""
import io
import pathlib
import re
import sys
import zipfile

import numpy as np
from PIL import Image

SRC = pathlib.Path(sys.argv[1] if len(sys.argv) > 1
                   else "Ceratophrys_ornata_frogCT.zip")
OUT = pathlib.Path(sys.argv[2] if len(sys.argv) > 2 else "static/data")

# Isotropic, and sized so the fingers and the jaw teeth survive.
#
# 256 across is 12.8 MB as a .raw and 3.1 MB as the example TIFF. At 160 the
# claws and the jaw muscle striations were mush; 320 costs twice as much again
# and adds very little on top of 256, so this is where the curve flattens.
# It is the most this deck spends on any one asset, and it is worth it because
# every volume slide in the session is a picture of it.
#
# Override from the command line to try another size:
#     tools/make-frog-volume.py <zip> static/data 320
ACROSS = int(sys.argv[3]) if len(sys.argv) > 3 else 256
VOXEL_UM = 26.6809

# Air inside the reconstruction circle sits at 18-22, and the stain puts
# tissue from about 30 up. Windowing from just above the air peak rather than
# from a percentile is what keeps the background a single flat value that one
# threshold removes - the thing the session keeps claiming about CT.
AIR = 24

# The top of the window, as a percentile of the downsampled volume. High
# enough that the skeleton keeps its own band above the muscle, low enough
# that the muscle is not squeezed into the bottom fifth of the range.
HI_PCT = 99.95


def slice_names(z):
    return sorted(n for n in z.namelist()
                  if re.search(r"_rec\d+\.bmp$", n)
                  and not n.startswith("__MACOSX"))


def main():
    if not SRC.exists():
        sys.exit(f"{SRC} not found - pass the path to the Dryad zip")

    zf = zipfile.ZipFile(SRC)
    names = slice_names(zf)
    if not names:
        sys.exit(f"{SRC} holds no _recNNNN.bmp slices")

    probe = Image.open(io.BytesIO(zf.read(names[0])))
    width, height = probe.size
    depth = len(names)

    # One cube per output voxel, so the grid stays isotropic whatever the
    # source aspect is.
    nx = ACROSS
    nz = round(ACROSS * height / width)
    ny = round(ACROSS * depth / width)
    print(f"{width}x{height}x{depth} -> {nx}x{nz}x{ny} (x, nose-tail, dorsal)")

    # Accumulate as (stack, row, col), box-averaging both in plane and along
    # the stack. Averaging rather than picking every nth slice: the scan is
    # noisy at full resolution and subsampling turns that noise into speckle
    # the transfer function then has to fight.
    stack = np.zeros((ny, nz, nx), dtype=np.float32)
    edges = np.linspace(0, depth, ny + 1).astype(int)
    for j in range(ny):
        lo, hi = edges[j], max(edges[j] + 1, edges[j + 1])
        acc = np.zeros((nz, nx), dtype=np.float32)
        for k in range(lo, hi):
            plane = Image.open(io.BytesIO(zf.read(names[k]))).convert("L")
            acc += np.asarray(plane.resize((nx, nz), Image.BOX),
                              dtype=np.float32)
        stack[j] = acc / (hi - lo)
        if j % 16 == 0:
            print(f"  {j}/{ny}", flush=True)

    hi = float(np.percentile(stack, HI_PCT))
    print(f"window [{AIR}, {hi:.1f}]")
    stack = np.clip((stack - AIR) / max(hi - AIR, 1e-6), 0, 1)

    # Dorsal is slice 0 in the scan and up in the scene, and a texture's y
    # points up - so the stack is reversed on the way into the output.
    # Without this the frog hangs upside down in every scene and each one has
    # to rotate it back.
    vol = stack[::-1]                       # (y, z, x), y now ventral->dorsal

    # x fastest, then y, then z - the layout a 3D texture wants. The array is
    # (y, z, x) and needs to be (z, y, x) for a plain C-order flatten to come
    # out in that order.
    data = (vol.transpose(1, 0, 2) * 255).round().astype(np.uint8).ravel(order="C")

    OUT.mkdir(parents=True, exist_ok=True)
    name = f"frog-{nx}x{ny}x{nz}.raw"
    (OUT / name).write_bytes(data.tobytes())

    extent = np.array([nx, ny, nz]) * (width / nx) * VOXEL_UM / 1000
    print(f"{OUT / name}: {nx}x{ny}x{nz}, {data.nbytes / 1e6:.2f} MB, "
          f"{extent[0]:.1f} x {extent[1]:.1f} x {extent[2]:.1f} mm")
    print("BOUNDS = ["
          + ", ".join(f"{0.5 * e / extent.max():.4f}" for e in extent) + "]")


if __name__ == "__main__":
    main()
