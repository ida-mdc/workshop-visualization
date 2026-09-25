#!/usr/bin/env python3
"""Build the three volumes for the "the work moves upstream" slide.

    uv run --with "cellpose==3.1.1.2" --with "numpy<2" --with packaging \
           --with tifffile --with scikit-image --with scipy --with torch \
           --index-url https://download.pytorch.org/whl/cpu \
           --extra-index-url https://pypi.org/simple \
           --index-strategy unsafe-best-match \
           python tools/make-upstream-volumes.py path/to/tribolium.zip

Noisy, denoised, segmented - the same block of numbers three times, so the
only thing that changes between the three panels on the slide is what was
done to the data. When a threshold cannot separate foreground from
background, that is where the work goes.

The specimen is a Tribolium castaneum embryo imaged at deliberately low laser
power, from the CARE paper's example data (Weigert et al., Nature Methods
2018, content-aware image restoration). It is here because it is genuinely,
violently noisy - the first version of this figure used a well-exposed
fluorescence stack and the noisy and the denoised panel came out looking the
same, which is the opposite of the point.

    http://csbdeep.bioimagecomputing.com/example_data/tribolium.zip

Cropped, not downsampled. Box-averaging a noisy volume IS denoising, and a
figure whose left-hand panel has been quietly cleaned up before anyone sees
it has nothing to say. So the slide shows a window onto part of the embryo at
the resolution it was acquired at, with every bit of the noise still in it.

## What denoises it, and why not Cellpose

Denoising is UniFMIR, fine-tuned on this exact CARE Tribolium data and
published as a pretrained model on the BioImage Model Zoo:

    UniFMIRDenoiseOnTribolium, https://bioimage.io/#/?id=decisive-panda
    Ma C, Tan W, He R, Yan B. doi:10.21203/rs.3.rs-3208267/v1  -  CC BY 4.0

Inference only. Nothing is trained here. The weights are TorchScript, so plain
torch runs them with no UniFMIR codebase; the model takes five adjacent z
slices and returns one denoised slice, so it slides down the stack.

Cellpose's own `denoise_nuclei` was here first and was replaced because it
barely moved off the noise - the middle panel still looked grainy and the
segmentation that followed found 26 objects in a window holding about a
hundred nuclei. UniFMIR recovers the nuclei about as well as the high-power
acquisition does.

Worth saying on the slide: this model was fine-tuned on this dataset, so it is
on home turf. That is the situation the tool is for, and it is also why your
own data usually needs fine-tuning rather than a model off a shelf.

Segmentation is still Cellpose 3's `nuclei` model in 3D, out of the box, run
on the denoised volume. StarDist was tried on the noisy volume directly and
finds 2 objects; dropping its probability threshold gets hundreds of noise
blobs instead. Denoising first is not optional.

The three `.raw` files are committed, so the site build does not depend on
Python, on torch, or on the 78 MB original.
"""
import io
import pathlib
import sys
import urllib.request
import zipfile

import numpy as np
import tifffile
from scipy import ndimage

OUT = pathlib.Path("static/data")

# A window onto the embryo, at acquisition resolution. Big enough to hold
# eight or nine nuclei across, small enough that three of these is under two
# megabytes on the page.
CROP = 120

# Inside the zip. The test pair rather than the training pair, for no reason
# beyond it being the smaller of the two.
LOW = "tribolium/test/low/nGFP_0.1_0.2_0.5_20_14_late.tif"
GT = "tribolium/test/GT/nGFP_0.1_0.2_0.5_20_14_late.tif"

# The pretrained denoiser, fetched once and cached beside this script.
UNIFMIR = ("https://uk1s3.embassy.ebi.ac.uk/public-datasets/bioimage.io"
           "/decisive-panda/1/files/weights.pt")
CACHE = pathlib.Path("tools/.cache")

# The model takes 5 adjacent z slices and returns one. Which of the five the
# output corresponds to is not documented, so it was measured: correlating the
# output against the clean stack peaks at window position 1.
WINDOW_Z = 5
WINDOW_OFFSET = 1

# Side of the square the model is run on. It wants 256; running it on a 256
# context centred on the 120-wide crop keeps the crop away from tile edges.
TILE = 256


def window(v, lo_pct=1.0, hi_pct=99.8):
    lo, hi = np.percentile(v, [lo_pct, hi_pct])
    return np.clip((v - lo) / max(hi - lo, 1e-6), 0, 1).astype(np.float32)


def nuclei(clean):
    """Isolated nuclei in the clean reference: their slices and sizes.

    Only the ones that came out as a single object of a plausible size. In
    the middle of the embryo the nuclei touch and threshold into one mass,
    and a mass is no use for measuring how big a nucleus is or how tall a
    voxel is.
    """
    labels, n = ndimage.label(clean > 0.35)
    if n == 0:
        return []
    sizes = np.bincount(labels.ravel())
    out = []
    for i, sl in enumerate(ndimage.find_objects(labels), start=1):
        if not 120 < sizes[i] < 4000:
            continue
        dz = sl[0].stop - sl[0].start
        dy = sl[1].stop - sl[1].start
        dx = sl[2].stop - sl[2].start
        if min(dy, dx) > 5 and dz > 1:
            out.append((sl, dz, dy, dx))
    return out


def anisotropy(isolated):
    """How much taller a voxel is than it is wide, measured off the nuclei.

    The stack is acquired with a z step the file says nothing about, so it is
    measured rather than assumed: a nucleus is a ball, so however much wider
    than tall it comes out in voxels is the ratio of the two samplings.
    """
    spans = [((dy + dx) / 2) / dz for _, dz, dy, dx in isolated]
    return float(np.median(spans)) if spans else 1.0


def nucleus_diameter(isolated):
    """How wide a nucleus is in plane, in pixels - what Cellpose wants."""
    widths = [(dy + dx) / 2 for _, _, dy, dx in isolated]
    return float(np.median(widths)) if widths else 22.0


def crop_window(clean, isolated):
    """Where to put the CROP x CROP window: over the most nuclei.

    Not over the densest signal, which is what this used to do and which
    lands square in the middle of the embryo - where the nuclei touch, the
    clean reference is a single grey mass and the panel has nothing in it
    anyone can count. Most SEPARATE nuclei is what makes a segmentation
    panel worth looking at.
    """
    half = CROP // 2
    centres = np.array([[(sl[1].start + sl[1].stop) / 2,
                         (sl[2].start + sl[2].stop) / 2]
                        for sl, *_ in isolated])
    best = None
    for j in range(half, clean.shape[1] - half, 8):
        for i in range(half, clean.shape[2] - half, 8):
            inside = ((np.abs(centres[:, 0] - j) < half - 6)
                      & (np.abs(centres[:, 1] - i) < half - 6)).sum()
            if best is None or inside > best[0]:
                best = (inside, j, i)
    count, j, i = best
    print(f"  window holds {count} separable nuclei")
    return slice(j - half, j + half), slice(i - half, i + half)


def denoiser():
    """The pretrained UniFMIR model, fetched once."""
    import torch
    CACHE.mkdir(parents=True, exist_ok=True)
    weights = CACHE / "unifmir-tribolium.pt"
    if not weights.exists():
        print(f"fetching {UNIFMIR}")
        urllib.request.urlretrieve(UNIFMIR, weights)
    model = torch.jit.load(str(weights))
    model.eval()
    return torch, model


def denoise_stack(low, ys, xs):
    """Run UniFMIR down the stack and return the CROP-wide window.

    The model is given a TILE-wide context centred on the crop, so the crop
    itself never sits against a tile edge, and only the middle is kept.
    """
    torch, model = denoiser()
    nz = low.shape[0]
    cy = (ys.start + ys.stop) // 2
    cx = (xs.start + xs.stop) // 2
    half = TILE // 2
    Y = slice(cy - half, cy + half)
    X = slice(cx - half, cx + half)
    keep = slice(half - CROP // 2, half + CROP // 2)

    out = np.zeros((nz, CROP, CROP), np.float32)
    with torch.no_grad():
        for z in range(nz):
            idx = [min(max(z - WINDOW_OFFSET + k, 0), nz - 1)
                   for k in range(WINDOW_Z)]
            tile = np.stack([low[i, Y, X] for i in idx])[None].astype(np.float32)
            r = model(torch.from_numpy(tile)).numpy()[0, 0]
            out[z] = r[keep, keep]
            if z % 10 == 0:
                print(f"  denoise {z}/{nz}", flush=True)
    return np.clip(out, 0, None)


def main():
    src = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "tribolium.zip")
    if not src.exists():
        sys.exit(f"{src} not found - pass the path to the CARE example zip")
    from cellpose import models

    zf = zipfile.ZipFile(src)
    low = tifffile.imread(io.BytesIO(zf.read(LOW))).astype(np.float32)
    gt = tifffile.imread(io.BytesIO(zf.read(GT))).astype(np.float32)
    print(f"source {low.shape}")

    clean_full = window(gt)
    isolated = nuclei(clean_full)
    ratio = anisotropy(isolated)
    diameter = nucleus_diameter(isolated)
    print(f"measured from {len(isolated)} isolated nuclei: anisotropy "
          f"{ratio:.2f}, diameter {diameter:.1f} px")

    ys, xs = crop_window(clean_full, isolated)
    print(f"crop y {ys.start}:{ys.stop}  x {xs.start}:{xs.stop}")

    lown = window(low)                 # normalised once, whole stack
    noisy = lown[:, ys, xs]
    print(f"noisy {noisy.shape}")

    print("denoising with UniFMIR...")
    clean = denoise_stack(lown, ys, xs)
    print(f"denoised {clean.shape}, range {clean.min():.3f}..{clean.max():.3f}")

    print("segmenting in 3D...")
    seg = models.Cellpose(model_type="nuclei", gpu=False)
    masks, _, _, _ = seg.eval(clean, channels=[0, 0], diameter=diameter,
                              do_3D=True, z_axis=0, anisotropy=ratio)
    masks = np.asarray(masks).astype(np.int32)
    n = int(masks.max())
    print(f"masks {masks.shape}, {n} objects")

    # One 8-bit entry per object, because the scene colors them through a
    # 256-entry lookup - which is one entry per label and no room for more.
    if n > 255:
        keep = np.argsort(np.bincount(masks.ravel())[1:])[::-1][:255] + 1
        remap = np.zeros(n + 1, dtype=np.uint8)
        remap[keep] = np.arange(1, len(keep) + 1, dtype=np.uint8)
        masks = remap[masks]
        print(f"  kept the 255 largest")
    labels = masks.astype(np.uint8)

    nz, ny, nx = noisy.shape
    OUT.mkdir(parents=True, exist_ok=True)
    for name, vol in (("noisy", noisy), ("denoised", clean)):
        data = (np.clip(vol, 0, 1) * 255).round().astype(np.uint8)
        write(f"upstream-{name}", data, nx, ny, nz)
    write("upstream-labels", labels, nx, ny, nz)

    print(f"\nSHAPE = [{nx}, {ny}, {nz}]")
    # Half-extents, longest side 0.5, with the measured z step folded in.
    ext = np.array([nx, ny, nz * ratio], dtype=float)
    ext = 0.5 * ext / ext.max()
    print("BOUNDS = [" + ", ".join(f"{e:.4f}" for e in ext) + "]")
    print(f"LABELS = {int(labels.max())}")


def write(stem, volume, nx, ny, nz):
    """x fastest, then y, then z - the layout a 3D texture wants."""
    name = f"{stem}-{nx}x{ny}x{nz}.raw"
    (OUT / name).write_bytes(volume.ravel(order="C").tobytes())
    print(f"{OUT / name}: {volume.nbytes / 1e6:.2f} MB")


if __name__ == "__main__":
    main()
