#!/usr/bin/env python3
"""The zoomed detail figure on the luxar slide.

The wide sunflower comparison is honest about the numbers but not about the
approximation: at whole-flower scale the fit and the source render pixel-for-
pixel alike, and a viewer has no way to see what 186,744 splats actually gave
up. This crops a small, detailed patch and fits *that* on its own, then
renders it back, so the blob-like softening a splat fit produces is something
to look at rather than take on faith.

The crop is a handful of individual disc florets, not the whole ring: at
ring scale each floret bump is only a few pixels across, small enough that a
splat covering one looks like a slightly soft pixel rather than a visibly
separate blob. Zoomed in on 2-3 florets, each bump is tens of pixels across,
and the fit's individual splats stop hiding in the resolution.

Small on purpose: fitting the whole flower at this same quality would cost
the full 20-30 minutes this crop takes under a minute, because a fit's cost
follows its splat count and a small patch needs far fewer of them.

    tools/make-sunflower-detail.py <sunflower.tif> [out-dir]

Then, same as the whole-flower slide:

    luxar gsplat fit detail.tif detail.gsplats.zarr --preset hifi --seeds 40000 -d cuda
    luxar gsplat render detail.gsplats.zarr rendered.tiff --shape <the crop's shape>
"""
import sys
from pathlib import Path

import numpy as np
import tifffile

# Found by looking at the top-down MIP for the disc floret ring, then zooming
# further into a cluster of individual floret bumps within it - see the
# module docstring for why this location and this much tighter than the
# ring-wide window an earlier version of this figure used.
CROP = (slice(200, 560), slice(170, 235), slice(295, 360))  # z, y, x


def main(src: Path, out_dir: Path):
    volume = tifffile.imread(src)
    crop = volume[CROP]
    print(f"{crop.shape}, {crop.size / 1e6:.1f} Mvoxel, "
          f"{100 * (crop > 3).mean():.1f}% carries signal")
    out_dir.mkdir(parents=True, exist_ok=True)
    tifffile.imwrite(out_dir / "detail.tif", crop, compression="deflate")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(Path(sys.argv[1]), Path(sys.argv[2]) if len(sys.argv) > 2 else Path("."))
