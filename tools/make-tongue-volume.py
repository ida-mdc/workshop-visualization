#!/usr/bin/env python3
"""Turn the published tongue-tissue micro-CT into a block the slides can stream.

    tools/make-tongue-volume.py path/to/Ceratophrys_ornata_tongueTissueCT.zip \
        [out-dir] [across]

The counterpart to the frog. Same animal, same deposit, opposite problem.

The frog scan is a specimen sitting in air: three quarters of its voxels are
exactly zero, so one threshold separates animal from background and every
transfer function slide has something easy to point at. This is a piece cut
out of that frog's tongue - Kleinteich & Gorb call it "a piece of tongue
tissue... cut out from the tongue after the animal was treated with Lugol's
solution", CC0:

    https://doi.org/10.5061/dryad.066mr

Inside it there is no background at all. Every voxel is sample. Measured on
the inscribed square of the reconstruction circle, the fraction of voxels at
exactly zero is 0.00002 - against 0.75 for the frog. That is the whole point
of the slide it feeds: drag a threshold across this block and nothing carves
out, because there is nothing in it that is not tissue.

1541 slices of 2172 x 2252 at 0.86686 um, 3.6 GB of BMP. Sub-micron, which is
why the glands and the fibre bundles are visible at all.

Two things this does that the frog tool does not:

CROP, then downsample. The reconstruction has a circular field of view, so the
corners of each slice are outside it and really are zero. Those corners are
the only background in the file and they are an artefact of the reconstruction
rather than anything about the specimen - leaving them in would put a fake
background into the one dataset chosen for having none. So a cube is cut from
inside the circle first. It is also the honest shape for this: a block of
tissue, drawn as a block.

WINDOW on percentiles, not on an air value. The frog tool windows from just
above the air peak, which is what keeps its background a single flat value.
There is no air peak here to window from.
"""
import io
import pathlib
import re
import sys
import zipfile

import numpy as np
from PIL import Image

SRC = pathlib.Path(sys.argv[1] if len(sys.argv) > 1
                   else "Ceratophrys_ornata_tongueTissueCT.zip")
OUT = pathlib.Path(sys.argv[2] if len(sys.argv) > 2 else "static/data")

# Output cube, per axis. Smaller than the frog on purpose: this block is shown
# as a solid brick and what it has to carry is texture, not a silhouette, so it
# does not need the resolution the animal does. 160 is 4.1 MB.
ACROSS = int(sys.argv[3]) if len(sys.argv) > 3 else 160

# Side of the source cube, in voxels, centred on the reconstruction circle.
# The inscribed square of the circle is about 1535 and there are 1541 slices,
# so 1200 sits comfortably inside both with room to spare at every face.
CUBE = 1200

# Where the block is taken from along the stack. The tissue thins towards the
# end of the scan - mean value falls from 38 to 22 across the 1541 slices - so
# the cube is centred rather than started at zero, which keeps all six faces in
# comparable tissue.
CENTRED = True

# The display window, as percentiles of the cropped cube. Wide enough to keep
# the glands and the fibre bundles apart, tight enough that the bulk of the
# tissue is not squeezed into a few values.
#
# The bottom is 0.02 and not the 0.5 you would normally reach for. Clipping
# half a percent of the tissue to zero would put a spike at zero into the one
# histogram in this workshop that is shown precisely because it has none - the
# slide claims there is no background in this block, and a reader who checks
# the histogram should find that true rather than nearly true.
LO_PCT = 0.02
HI_PCT = 99.7


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
    print(f"source {width}x{height}x{depth}")

    if CUBE > min(width, height, depth):
        sys.exit(f"CUBE={CUBE} does not fit in {width}x{height}x{depth}")

    # The circle is centred in the slice, so the cube is too.
    x0 = (width - CUBE) // 2
    y0 = (height - CUBE) // 2
    z0 = (depth - CUBE) // 2 if CENTRED else 0
    print(f"cube {CUBE}^3 at x{x0} y{y0} z{z0}")

    n = ACROSS
    stack = np.zeros((n, n, n), dtype=np.float32)
    edges = np.linspace(z0, z0 + CUBE, n + 1).astype(int)
    for k in range(n):
        lo, hi = edges[k], max(edges[k] + 1, edges[k + 1])
        acc = np.zeros((n, n), dtype=np.float32)
        for s in range(lo, hi):
            plane = Image.open(io.BytesIO(zf.read(names[s]))).convert("L")
            plane = plane.crop((x0, y0, x0 + CUBE, y0 + CUBE))
            acc += np.asarray(plane.resize((n, n), Image.BOX), dtype=np.float32)
        stack[k] = acc / (hi - lo)
        if k % 16 == 0:
            print(f"  {k}/{n}", flush=True)

    lo = float(np.percentile(stack, LO_PCT))
    hi = float(np.percentile(stack, HI_PCT))
    print(f"window [{lo:.1f}, {hi:.1f}]   before: {float((stack == 0).mean()):.6f} "
          f"of voxels at exactly zero")
    stack = np.clip((stack - lo) / max(hi - lo, 1e-6), 0, 1)

    # x fastest, then y, then z - the layout a 3D texture wants. The cube is
    # isotropic, so unlike the frog there is no axis to reorder.
    data = (stack * 255).round().astype(np.uint8).ravel(order="C")
    # The number the slide rests on, reported from what actually gets written.
    print(f"after quantising: {float((data == 0).mean()):.6f} of voxels at "
          f"exactly zero (the frog, for comparison, is 0.75)")

    OUT.mkdir(parents=True, exist_ok=True)
    name = f"tongue-{n}x{n}x{n}.raw"
    (OUT / name).write_bytes(data.tobytes())

    mm = CUBE * 0.86686 / 1000
    print(f"{OUT / name}: {n}x{n}x{n}, {data.nbytes / 1e6:.2f} MB, "
          f"{mm:.2f} mm on a side")


if __name__ == "__main__":
    main()
