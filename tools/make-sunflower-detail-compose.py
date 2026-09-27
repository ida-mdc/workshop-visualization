#!/usr/bin/env python3
"""Compose the "Voxels" / "Splats" side-by-side PNG for the detail crop.

tools/make-sunflower-detail.py crops the raw volume and documents the luxar
fit/render commands, but the crop is only 65x65 pixels natively - the whole
point of zooming this far in. An earlier version of this figure upscaled
both panels for display with smooth (bicubic/Lanczos) resampling, which
quietly re-blurred the voxel panel back into looking soft - exactly the
false impression the whole-flower slide already avoids, and the opposite of
what this crop exists to show (the source stays a sharp point; the fit is
the one that turns it into a blob). Nearest-neighbor upscaling instead: every
final block is one real voxel or one real splat-render sample, not an
average of several.

Inputs (produced by the luxar commands in make-sunflower-detail.py's
docstring, run separately - not scripted here, since they need a GPU and
luxar's own CUDA build):
    detail.tif       the raw voxel crop, uint8, (Z, Y, X)
    rendered.tiff     the fitted splats rendered back over the same crop,
                       float32, (Z, Y, X)
    detail.gsplats.zarr/centers  read only for its splat count, for the label

    tools/make-sunflower-detail-compose.py <dir-with-those-three> [out.png]

Default out.png is static/img/luxar-sunflower-detail.png. Re-running overwrites.
"""
import json
import sys
from pathlib import Path

import numpy as np
import tifffile
from PIL import Image, ImageDraw, ImageFont

UPSCALE = 8       # nearest-neighbor factor - keeps every voxel a visible block
BAR_H = 40        # label bar height, matching the whole-flower comparison
FONT_SIZE = 18


def mip_u8(volume: np.ndarray) -> np.ndarray:
    """Max-intensity projection along z, scaled to its own 0-255 range."""
    proj = volume.astype(np.float32).max(axis=0)
    peak = proj.max()
    if peak > 0:
        proj = proj / peak * 255.0
    return proj.clip(0, 255).astype(np.uint8)


def splat_count(zarr_dir: Path) -> int:
    meta = json.loads((zarr_dir / "centers" / "zarr.json").read_text())
    return meta["shape"][0]


def panel(img_u8: np.ndarray) -> Image.Image:
    im = Image.fromarray(img_u8, mode="L").convert("RGB")
    return im.resize((im.width * UPSCALE, im.height * UPSCALE), Image.NEAREST)


def label(draw: ImageDraw.ImageDraw, text: str, cx: int, font):
    draw.text((cx, BAR_H / 2), text, fill="white", font=font, anchor="mm")


def main(src_dir: Path, out_png: Path):
    voxels = mip_u8(tifffile.imread(src_dir / "detail.tif"))
    splats = mip_u8(tifffile.imread(src_dir / "rendered.tiff"))
    n_splats = splat_count(src_dir / "detail.gsplats.zarr")

    left = panel(voxels)
    right = panel(splats)
    w, h = left.width, left.height
    gap = 2

    canvas = Image.new("RGB", (w * 2 + gap, h + BAR_H), "black")
    canvas.paste(left, (0, BAR_H))
    canvas.paste(right, (w + gap, BAR_H))

    draw = ImageDraw.Draw(canvas)
    try:
        font = ImageFont.truetype(
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", FONT_SIZE)
    except OSError:
        font = ImageFont.load_default()
    label(draw, "Voxels", w // 2, font)
    label(draw, f"Splats ({n_splats:,})", w + gap + w // 2, font)

    out_png.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(out_png)
    print(f"wrote {out_png} ({canvas.width}x{canvas.height}, native crop "
          f"{voxels.shape[1]}x{voxels.shape[0]}, {UPSCALE}x nearest-neighbor)")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(Path(sys.argv[1]),
         Path(sys.argv[2]) if len(sys.argv) > 2 else Path("static/img/luxar-sunflower-detail.png"))
