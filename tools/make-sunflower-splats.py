#!/usr/bin/env python3
"""The sunflower on the "luxar fits the volume" slide, from micro-CT to splats.

Source: Chitwood, Quigley & Frank, *X-ray CT Botanical Images - Set 1*,
Zenodo 2025, CC BY 4.0 - <https://doi.org/10.5281/zenodo.15684909>. The
sunflower head is three zip files of TIFF slices, 5.3 GB together:

    Sunflower Y Slices-20250430T194438Z-1-00{1,2,3}.zip

The slices are numbered across all three zips, so none of them is a volume on
its own. This reads them straight out of the archives without unpacking - the
full stack is 1371 x 1212 x 1841 uint16, 6.1 GB, and unpacking it needs disk
nobody has spare.

    tools/make-sunflower-splats.py <dir-with-the-three-zips> [out.tif]

Two choices are baked in and worth knowing about:

WINDOW.  Air and the foam the head sits in fill most of the scan; the head
itself is far brighter. Sampling five slices puts the 90th percentile at
~13000 and the 99th at ~43000, so [20000, 60000] separates them cleanly and
sends everything below it to exactly zero. That zero matters: a Gaussian fit
spends parameters wherever there is signal, so a background left at a faint
non-zero costs splats and blurs the result. Only 2.6% of voxels survive.

SCALE.  Halved on every axis, which keeps the individual florets resolved and
brings the fit down to about half an hour on a laptop GPU.

The fit itself is three luxar commands, the third being the one the README's
summary leaves out:

    luxar gsplat fit sunflower.tif sf.gsplats.zarr \\
        --preset standard --seeds 200000 -d cuda \\
        --tiling uniform --tile-size 192 --overlap 24
    luxar gsplat flatten sf.gsplats.zarr sf-flat.gsplats.zarr
    luxar gsplat lod sf-flat.gsplats.zarr sf-scene.gsplats.zarr --recipe levels
    luxar gsplat convert sf-scene.gsplats.zarr sf.luxar.zarr \\
        --colormap gray --tone-mapping ACES

`fit` needs luxar's CUDA kernels compiled (`make build-cuda` from a checkout).
Without them it falls back to PyTorch and runs orders of magnitude slower -
slow enough that the whole thing looks broken rather than slow.
"""
import io
import sys
import zipfile
from pathlib import Path

import numpy as np
import tifffile

LO, HI = 20000.0, 60000.0   # see WINDOW above
STEP = 2                    # see SCALE above


def slice_index(zips):
    """Map slice number -> (archive, member), across all the archives."""
    index = {}
    for z in zips:
        for name in z.namelist():
            if name.lower().endswith(".tif"):
                index[int(name.split("_")[-1].split(".")[0])] = (z, name)
    return index


def build(src_dir: Path):
    zips = [zipfile.ZipFile(p) for p in sorted(src_dir.glob("*.zip"))]
    if not zips:
        sys.exit(f"no zip files in {src_dir}")
    index = slice_index(zips)
    keys = sorted(index)
    print(f"{len(keys)} slices, {keys[0]}..{keys[-1]}")

    def read(i):
        z, name = index[i]
        return tifffile.imread(io.BytesIO(z.read(name))).astype(np.float32)

    probe = read(keys[0])
    Z, Y, X = len(keys) // STEP, probe.shape[0] // STEP, probe.shape[1] // STEP
    out = np.zeros((Z, Y, X), np.uint8)
    for j in range(Z):
        block = sum(read(keys[STEP * j + k]) for k in range(STEP))
        block = block[: Y * STEP, : X * STEP]
        block = block.reshape(Y, STEP, X, STEP).mean(axis=(1, 3)) / STEP
        out[j] = (np.clip((block - LO) / (HI - LO), 0, 1) * 255).astype(np.uint8)
        if j % 120 == 0:
            print(f"  {j}/{Z}", flush=True)

    # Crop to what is left after the window, so no tile of the fit is spent on
    # a margin of pure zero.
    nz = np.nonzero(out > 3)
    lo_hi = [(int(a.min()), int(a.max()) + 1) for a in nz]
    out = out[lo_hi[0][0]:lo_hi[0][1], lo_hi[1][0]:lo_hi[1][1], lo_hi[2][0]:lo_hi[2][1]]
    print(f"{out.shape}, {out.size / 1e6:.0f} Mvoxel, "
          f"{100 * float((out > 3).mean()):.1f}% carries signal")
    return out


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    dest = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("sunflower.tif")
    tifffile.imwrite(dest, build(Path(sys.argv[1])), compression="deflate")
    print(f"wrote {dest}")
