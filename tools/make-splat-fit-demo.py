#!/usr/bin/env python3
"""The interactive "what a Gaussian splat actually is" figure.

Everywhere else in this section, a splat fit uses luxar's real CUDA fitting
pipeline (see tools/make-sunflower-splats.py, tools/make-sunflower-detail.py).
This demo used to reimplement fitting from scratch in plain PyTorch instead -
no tiling, no CUDA kernels, just a dense per-splat tensor over the whole
image every step - because the target was small enough that the naive
version was still fast at a handful of splats. It stopped being fast once
the demo asked for more of them: cost grew close to splat_count^1.5 in the
naive version (more splats needs both more steps and more per-step work),
while luxar's actual tiled rasterizer barely notices the difference (K=120
and K=3000 took about the same wall time in testing - the CLI's own
startup cost dominates, not the fit). So this now calls the same luxar CLI
the real examples use, once per level, instead of a hand-rolled optimizer.

The target is a crop of the real sunflower render this section uses
elsewhere (img/luxar-sunflower.png's own left panel) - not a fresh dataset,
so the toy demo and the real example are visibly the same subject at two
very different scales. The crop is the outer ray florets and the drooping
bracts behind them, not the whole flower.

Every level in LEVELS is an independent fit from a fresh random seed count,
not a subset of a bigger one. luxar culls near-zero-amplitude splats after
fitting, so the saved splat count can be a little below the requested seed
count - the manifest records what was actually kept.

    tools/make-splat-fit-demo.py <luxar-sunflower.png> [out-dir] [--luxar path/to/luxar]

Writes out-dir/splat-fit-target.png (the toy target, for the "Target" panel),
out-dir/splat-fit-level-<k>.png (the "Fit" panel at each level), and
out-dir/splat-fit.json (a manifest: requested/kept splat count and image
path per level, plus the target's own aspect ratio) - read directly by
static/js/viz/scenes/splat-fit.js.

Needs a built luxar checkout - see the memory note "luxar checkout is
persistent" for where one already lives on this machine, and
tools/make-sunflower-splats.py's docstring for how to build one from scratch.
"""
import argparse
import json
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image

DEFAULT_LUXAR = ("/media/data/Development/hi/repos/workshops/"
                  "sunflower-luxar/luxar/.venv/bin/luxar")

LEVELS = [4, 12, 40, 120, 400, 1200, 3000]
PRESET = "draft"           # 2000 iterations - plenty at this target size
UPSCALE = 4                # nearest-neighbor - every block is one real sample

# Found by looking at the left (voxel) panel of img/luxar-sunflower.png with a
# pixel grid overlaid: the outer ray florets on the left side of the flower,
# with their drooping bracts behind them and a corner of the bright disc top
# right for contrast. Coordinates are relative to that panel, before any trim.
CROP = (60, 240, 340, 560)  # left, top, right, bottom
TARGET_W, TARGET_H = 132, 151


def load_target(sunflower_png: Path) -> np.ndarray:
    im = Image.open(sunflower_png).convert("L")
    w, h = im.size
    left_panel = im.crop((0, 0, w // 2, h))       # the voxel panel, not the splat one
    crop = left_panel.crop(CROP)
    small = crop.resize((TARGET_W, TARGET_H), Image.LANCZOS)
    return np.asarray(small, dtype=np.float32)


def run(luxar: str, *args: str) -> str:
    r = subprocess.run([luxar, *args], capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit(f"{' '.join(args)} failed:\n{r.stdout}\n{r.stderr}")
    return r.stdout


def kept_splat_count(zarr_dir: Path) -> int:
    meta = json.loads((zarr_dir / "centers" / "zarr.json").read_text())
    return meta["shape"][0]


def to_png(arr: np.ndarray, out: Path):
    """Normalize to 0-255 and upscale with nearest-neighbor - no interpolation
    that would make a coarse fit look smoother than it actually is."""
    peak = arr.max()
    u8 = (arr / peak * 255).clip(0, 255).astype(np.uint8) if peak > 0 else arr.astype(np.uint8)
    im = Image.fromarray(u8, mode="L")
    im = im.resize((im.width * UPSCALE, im.height * UPSCALE), Image.NEAREST)
    im.save(out)


def fit_one(luxar: str, k: int, target_npy: Path, work: Path, out_dir: Path):
    zarr_out = work / f"level-{k}.gsplats.zarr"
    run(luxar, "gsplat", "fit", str(target_npy), str(zarr_out),
        "--seeds", str(k), "--preset", PRESET, "--device", "cuda")
    n = kept_splat_count(zarr_out)

    rendered_npy = work / f"level-{k}-rendered.npy"
    run(luxar, "gsplat", "render", str(zarr_out), str(rendered_npy),
        "--shape", f"{TARGET_H},{TARGET_W}", "--device", "cuda")
    rendered = np.load(rendered_npy)

    image_name = f"splat-fit-level-{k}.png"
    to_png(rendered, out_dir / image_name)
    return {"k": k, "n": n, "image": image_name}


def main(sunflower_png: Path, out_dir: Path, luxar: str):
    out_dir.mkdir(parents=True, exist_ok=True)
    target = load_target(sunflower_png)
    to_png(target, out_dir / "splat-fit-target.png")

    with tempfile.TemporaryDirectory() as tmp:
        work = Path(tmp)
        target_npy = work / "target.npy"
        np.save(target_npy, target[None, :, :])  # (1, H, W) - a flat "volume"

        levels = []
        for k in LEVELS:
            r = fit_one(luxar, k, target_npy, work, out_dir)
            print(f"K={k:5d}  kept={r['n']:5d}  -> {r['image']}")
            levels.append(r)

    manifest = {"aspect": TARGET_W / TARGET_H, "levels": levels}
    (out_dir / "splat-fit.json").write_text(json.dumps(manifest))
    print(f"wrote {out_dir / 'splat-fit.json'}")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("sunflower_png", type=Path)
    p.add_argument("out_dir", type=Path, nargs="?", default=Path("."))
    p.add_argument("--luxar", default=DEFAULT_LUXAR)
    args = p.parse_args()
    if not Path(args.luxar).exists():
        sys.exit(f"luxar not found at {args.luxar} - see the module docstring")
    main(args.sunflower_png, args.out_dir, args.luxar)
