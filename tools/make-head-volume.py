#!/usr/bin/env python3
"""Turn example_data/t1-head.tif into a volume the slides can stream.

The deck's illustrations need a real dataset to sit beside the procedural
flower - something with noise, soft tissue boundaries and no clean background,
which is exactly what a threshold cannot separate. The T1 head that ships in
example_data is that dataset, but at 256x256x129 in 16 bit it is 17 MB, and
nothing in a browser reads TIFF without a library.

So: downsample, window to 8 bit, and write a flat array that fetch() can hand
straight to a Data3DTexture. The shape is in the filename because the loader
has to know it and a second file to keep in sync is a second file to get
wrong.

    tools/make-head-volume.py [output-dir]

Re-run it if the source changes; the result is committed, so the site build
does not depend on Python or on the 17 MB original.
"""
import pathlib
import sys

import numpy as np
from PIL import Image

SRC = pathlib.Path("example_data/t1-head.tif")
OUT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "static/data")

# 128 across the slice, 112 through it. Small enough to fetch on a conference
# wifi, big enough that a maximum intensity projection still shows vessels
# rather than a smudge.
TARGET = (128, 128, 112)

# Percentile window rather than min/max. An MRI has a handful of very bright
# voxels and a long tail of near-zero background; scaling by the true maximum
# pushes everything interesting into the bottom fifth of the range, and the
# transfer function then has no room to work in.
LO_PCT, HI_PCT = 0.5, 99.5


def load(path):
    im = Image.open(path)
    frames = getattr(im, "n_frames", 1)
    planes = []
    for i in range(frames):
        im.seek(i)
        planes.append(np.asarray(im, dtype=np.float32))
    return np.stack(planes)          # (z, y, x)


def resample(vol, shape):
    """Box-average down to `shape`, which is what avoids aliasing the noise."""
    out = vol
    for axis, target in enumerate(shape):
        idx = np.linspace(0, out.shape[axis], target + 1).astype(int)
        out = np.stack([
            out.take(range(idx[i], max(idx[i] + 1, idx[i + 1])), axis=axis)
              .mean(axis=axis)
            for i in range(target)
        ], axis=axis)
    return out


def main():
    if not SRC.exists():
        sys.exit(f"{SRC} not found - run this from the repository root")
    vol = load(SRC)                                  # (z, y, x)
    nx, ny, nz = TARGET
    vol = resample(vol, (nz, ny, nx))                # (z, y, x) order

    lo, hi = np.percentile(vol, [LO_PCT, HI_PCT])
    vol = np.clip((vol - lo) / max(hi - lo, 1e-6), 0, 1)

    # The scan is SAGITTAL, which the mid-planes make obvious: fixing the
    # slice index gives a face profile. So the axes are
    #
    #     x  anterior-posterior   256 @ 0.98 mm  = 250 mm
    #     y  superior-inferior    256 @ 0.98 mm  = 250 mm
    #     z  left-right           129 @ 1.50 mm  = 193 mm
    #
    # and y runs the way image rows do, downwards. A 3D texture's y is the
    # box's y, which points up, so without this flip the head hangs upside
    # down and every scene has to rotate it back - including the slice plane,
    # which would then be seen edge-on as a line.
    vol = vol[:, ::-1, :]

    # x fastest, then y, then z - the layout a 3D texture wants. The array is
    # already (z, y, x), so a plain C-order flatten is exactly that.
    data = (vol * 255).round().astype(np.uint8).ravel(order="C")

    OUT.mkdir(parents=True, exist_ok=True)
    name = f"t1-head-{nx}x{ny}x{nz}.raw"
    (OUT / name).write_bytes(data.tobytes())
    print(f"{OUT / name}: {nx}x{ny}x{nz}, {data.nbytes / 1e6:.2f} MB, "
          f"window [{lo:.0f}, {hi:.0f}]")


if __name__ == "__main__":
    main()
