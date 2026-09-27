#!/usr/bin/env python3
"""Fetch an Antscan specimen and write the volume the notebooks use.

    tools/make-ant-volume.py [specimen-id] [out-dir] [downsample]

Default is specimen 1031, *Acromyrmex balzani* - a leafcutter ant worker,
CASENT0744618, unstained, synchrotron micro-CT at KIT. CC BY 4.0.

Antscan publishes each specimen's slice viewer as a stack of 8-bit PNGs, which
is the only copy that downloads without an account. The `download/?object=`
endpoint on the specimen page wants a login and returns 500 without one.

Why this specimen. It is the voxels-to-mesh session's worked example, and an
ant earns that slot: the legs, antennae and hairs are a few voxels across, so
the threshold, the blur and the decimation sliders all have something visible
to destroy.

It also demonstrates the border gotcha by itself. The legs and antennae run off
every face of the scan, so an unpadded extraction is open in a dozen places.

## Resolution

The specimen page gives 2.44 um for the full-resolution scan and 400 x 393 for
the viewer stack. It does not say what the viewer stack was downsampled by.

Two lines of evidence put it at 2x, i.e. 4.88 um per preview voxel. The stack
is 1516 slices, which at 4.88 um is 7.4 mm - the right length for an
Acromyrmex worker with its antennae out, where 2.44 um would give 3.7 mm and
9.76 um would give 14.8 mm. Take the derived number as derived; the specimen
page is the authority for the 2.44 um.

This script then box-averages by `downsample` again, so the default output is
9.76 um isotropic.

## Size

Full preview stack is 1516 x 393 x 400, 238 MB as uint8. Halved it is
758 x 196 x 200, which deflates to about 15 MB - the same order as the other
example volumes, and small enough to commit.

Nothing here crops. The specimen fills the field of view in all three axes, so
there is no margin to take off.
"""
import pathlib
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor

import numpy as np
import tifffile
from PIL import Image

SPECIMEN = sys.argv[1] if len(sys.argv) > 1 else "1031"
OUT = pathlib.Path(sys.argv[2] if len(sys.argv) > 2
                   else "example_data/antscan-acromyrmex")
DOWNSAMPLE = int(sys.argv[3]) if len(sys.argv) > 3 else 2

# The viewer's stack for specimen 1031. Other specimens sit under their own
# directory, which the specimen page names in the sliceviewer call.
BASE = "https://biomedisa.info/media/antscan/processed/5x/24-34_lowres"
SLICES = 1516
VOXEL_UM = 2.44 * 2 * DOWNSAMPLE


def fetch(i):
    url = f"{BASE}/slice_{i:04d}.png"
    with urllib.request.urlopen(url, timeout=120) as response:
        return np.asarray(Image.open(response).convert("L"))


def box_average(volume, factor):
    """Box-average by an integer factor, trimming the remainder."""
    if factor == 1:
        return volume
    z, y, x = (d // factor * factor for d in volume.shape)
    trimmed = volume[:z, :y, :x]
    return trimmed.reshape(
        z // factor, factor, y // factor, factor, x // factor, factor,
    ).mean(axis=(1, 3, 5)).astype(np.uint8)


def main():
    OUT.mkdir(parents=True, exist_ok=True)

    print(f"fetching {SLICES} slices from {BASE}")
    with ThreadPoolExecutor(max_workers=8) as pool:
        slices = list(pool.map(fetch, range(SLICES)))
    volume = np.stack(slices)
    print(f"  stack {volume.shape}, {volume.nbytes / 1e6:.0f} MB")

    volume = box_average(volume, DOWNSAMPLE)
    z, y, x = volume.shape
    path = OUT / f"acromyrmex-{x}x{y}x{z}.tif"
    tifffile.imwrite(path, volume, compression="deflate")

    print(f"  wrote {path}  {volume.shape} (z, y, x)")
    print(f"  {VOXEL_UM:.2f} um isotropic, {path.stat().st_size / 1e6:.1f} MB")


if __name__ == "__main__":
    main()
