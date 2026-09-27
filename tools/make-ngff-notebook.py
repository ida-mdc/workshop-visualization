#!/usr/bin/env python3
"""Rebuild notebooks/tiff_to_ngff_and_neuroglancer.ipynb from the cells below.

    tools/make-ngff-notebook.py [out.ipynb]

Generated rather than hand-edited, the same as
tools/make-voxel-to-mesh-notebook.py, so the steps stay in one readable file
and stay in order. Run it, then execute the notebook to fill in the outputs.

The specimen is the frog head from example_data/, which is also what the
voxels session renders - so somebody who did that session is converting a
volume they have already looked at.
"""
import json
import sys
from pathlib import Path

CELLS = []


def md(text):
    CELLS.append({
        "cell_type": "markdown", "metadata": {},
        "source": text.strip("\n").splitlines(keepends=True),
    })


def code(text):
    CELLS.append({
        "cell_type": "code", "metadata": {}, "execution_count": None, "outputs": [],
        "source": text.strip("\n").splitlines(keepends=True),
    })


# --------------------------------------------------------------------- intro

md("""
# A TIFF volume to OME-Zarr, and into Neuroglancer

A TIFF stack is one file that a reader opens from the start. OME-Zarr is a
directory of small chunks plus one JSON file, which a viewer can fetch pieces
of over HTTP.

That difference is the whole point. It is what lets a browser open a volume
far larger than memory, and what every tool on the large-data slides is built
around.

| | step | |
|---|---|---|
| 1 | Load the TIFF, and its voxel size | the pyramid is wrong without it |
| 2 | Build the multiscale pyramid | and what it costs - less than you think |
| 3 | Write the OME-Zarr | one call, and then look at what it made |
| 4 | Validate it | against the official schema, not by eye |
| 5 | Serve it with CORS | the step that silently breaks |
| 6 | Open it in Neuroglancer | a `zarr://` URL you can build in Python |
| 7 | Open the same store elsewhere | napari, MoBIE, BigVolumeBrowser |

**Specimen.** The head of an Argentine horned frog, *Ceratophrys ornata*,
iodine-stained micro-CT. It is the volume the voxels session renders, so this
converts something you have already looked at.

Source and licence: `example_data/ceratophrys-ornata/CREDITS.md` (CC0).
""")

code("""
import json
import shutil
import subprocess
import sys
import time
import urllib.request
from pathlib import Path
from urllib.parse import quote

import ngff_zarr as nz
import numpy as np
import tifffile as tiff

OUT = Path("results") / "ngff"
OUT.mkdir(parents=True, exist_ok=True)


def directory_size(path):
    \"\"\"Bytes on disk under `path`.\"\"\"
    return sum(f.stat().st_size for f in Path(path).rglob("*") if f.is_file())


def mb(n):
    return f"{n / 1e6:.2f} MB"
""")

# ------------------------------------------------------------------- step 1

md("""
## 1. Load the TIFF, and its voxel size

The array and how big a voxel is. OME-Zarr records the voxel size in its
metadata, so getting it wrong here means every tool downstream draws the
volume at the wrong proportions.

This scan is 202 µm isotropic, which is in `CREDITS.md` rather than in the
TIFF - normal for anything not written by ImageJ.
""")

code("""
VOLUME = Path("../example_data/ceratophrys-ornata/frog-head-256x256x195.tif")
VOXEL_UM = 202.0          # isotropic, from CREDITS.md

vol = tiff.imread(VOLUME)

print(f"shape  {vol.shape}  (z, y, x)")
print(f"dtype  {vol.dtype}, range {vol.min()}-{vol.max()}")
print(f"extent {np.round(np.array(vol.shape) * VOXEL_UM / 1000, 1)} mm")
print(f"TIFF on disk: {mb(VOLUME.stat().st_size)}")
""")

# ------------------------------------------------------------------- step 2

md("""
## 2. Build the multiscale pyramid

A pyramid is the same volume at several resolutions. A viewer showing the
whole specimen reads the smallest level; zoom in and it reads chunks of a
finer one, only for the part you are looking at.

**The pyramid is cheaper than people expect.** Halving each of three axes
divides the voxel count by eight, so the levels sum to 1 + 1/8 + 1/64 + ... =
8/7 of the original. About 14% on top, whatever the volume.
""")

code("""
image = nz.to_ngff_image(
    vol,
    dims=("z", "y", "x"),
    scale={"z": VOXEL_UM, "y": VOXEL_UM, "x": VOXEL_UM},
    axes_units={"z": "micrometer", "y": "micrometer", "x": "micrometer"},
    name="frog-head",
)

# 64^3 chunks: small enough that a viewer fetches only what it draws, large
# enough that the per-chunk overhead stays negligible. See step 7.
multiscales = nz.to_multiscales(image, scale_factors=[2, 4, 8], chunks=64)

print(f"{'level':<7}{'shape':<22}{'voxels':>12}")
for i, level in enumerate(multiscales.images):
    print(f"{i:<7}{str(level.data.shape):<22}{level.data.size:>12,}")

total = sum(level.data.size for level in multiscales.images)
print(f"\\npyramid is {total / multiscales.images[0].data.size:.3f}x "
      f"the voxels of level 0")
""")

# ------------------------------------------------------------------- step 3

md("""
## 3. Write the OME-Zarr

One call. `version="0.4"` is the version the widest set of tools reads today;
0.5 exists and moves the metadata into zarr v3.
""")

code("""
STORE = OUT / "frog-head.ome.zarr"
shutil.rmtree(STORE, ignore_errors=True)

nz.to_ngff_zarr(STORE, multiscales, version="0.4")

print(f"wrote {STORE}")
print(f"on disk: {mb(directory_size(STORE))}  "
      f"(TIFF was {mb(VOLUME.stat().st_size)})")
""")

md("""
Now look at what that made, because the format is not hiding anything.
""")

code("""
attrs = json.loads((STORE / ".zattrs").read_text())
meta = attrs["multiscales"][0]

print(f"OME-NGFF version {meta['version']}")
print(f"axes: {[(a['name'], a.get('unit')) for a in meta['axes']]}\\n")

print(f"{'dataset':<24}{'shape':<20}{'chunk':<16}{'files':>7}{'size':>10}{'voxel um':>10}")
for dataset in meta["datasets"]:
    path = STORE / dataset["path"]
    zarray = json.loads((path / ".zarray").read_text())
    files = [f for f in path.rglob("*") if f.is_file() and not f.name.startswith(".")]
    scale = dataset["coordinateTransformations"][0]["scale"][0]
    print(f"{dataset['path']:<24}{str(zarray['shape']):<20}"
          f"{str(zarray['chunks']):<16}{len(files):>7}{mb(directory_size(path)):>10}"
          f"{scale:>10.0f}")

print(f"\\ncompressor: {zarray['compressor']}")
""")

md("""
Every one of those files is one chunk of the volume. A viewer asks for the
chunks that cover what is on screen, at the level that matches the zoom, and
ignores the rest.

That is the mechanism behind every "it streams" claim in the large-data
session. There is no server doing anything clever - it is a static directory.
""")

# ------------------------------------------------------------------- step 4

md("""
## 4. Validate it

The slides point at the [OME-NGFF validator](https://ome.github.io/ome-ngff-validator/),
a web page you paste a URL into. It checks the metadata against the published
JSON schema, and `ngff-zarr` bundles those schemas so you can run the same
check offline.

Worth doing every time. A store with slightly wrong metadata loads fine in the
tool that wrote it and fails in the one you send it to.
""")

code("""
# nz.validate raises jsonschema's ValidationError, not the ngff_zarr class of
# the same name - that one belongs to its separate structural check.
import jsonschema

nz.validate(attrs, version="0.4", model="image")
print("valid OME-NGFF 0.4")

# And a negative control, because a check that cannot fail is not a check.
broken = json.loads(json.dumps(attrs))
del broken["multiscales"][0]["axes"]
try:
    nz.validate(broken, version="0.4", model="image")
    print("the validator missed a store with no axes")
except jsonschema.ValidationError as error:
    print(f"a store with no axes is rejected: {error.message}")
""")

# ------------------------------------------------------------------- step 5

md("""
## 5. Serve it with CORS

A browser refuses to read data from another origin unless the server says it
may, with an `Access-Control-Allow-Origin` header. Without it Neuroglancer
stays empty while `curl` works perfectly - which is the single most common
reason this does not work first time.

`example_data/server.py` is Google's own CORS server from the Neuroglancer
repository, and it is already here.
""")

code("""
PORT = 8123

server = subprocess.Popen(
    [sys.executable, "../example_data/server.py", "-d", str(OUT), "-p", str(PORT)],
    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
)
time.sleep(2)

base = f"http://127.0.0.1:{PORT}/{STORE.name}"
with urllib.request.urlopen(f"{base}/.zattrs", timeout=10) as response:
    cors = response.headers.get("Access-Control-Allow-Origin")
print(f"serving {OUT} on port {PORT}")
print(f"Access-Control-Allow-Origin: {cors}")

chunk = f"{base}/{meta['datasets'][0]['path']}/0/0/0"
with urllib.request.urlopen(chunk, timeout=10) as response:
    print(f"one chunk: {len(response.read())} bytes from {chunk}")
""")

# ------------------------------------------------------------------- step 6

md("""
## 6. Open it in Neuroglancer

Neuroglancer's whole state - layers, sources, camera - lives in the URL
fragment as JSON. So a link is something you build, not something you click
your way to and copy.

`zarr://` in front of an ordinary http URL is what tells it the source is
Zarr. Neuroglancer reads OME-Zarr 0.4 and 0.5, and picks up the pyramid and
the voxel size from the metadata written in step 3.
""")

code("""
NEUROGLANCER = "https://neuroglancer-demo.appspot.com/#!"

state = {
    "layers": [{
        "type": "image",
        "name": "frog-head",
        "source": f"zarr://{base}/",
    }],
    "layout": "4panel",
}

url = NEUROGLANCER + quote(json.dumps(state, separators=(",", ":")), safe="")
print(url)
""")

md("""
Open that while the server in step 5 is still running.

**Chrome 142 and later will block it unless you allow it.** A page on a public
https origin reading from `127.0.0.1` needs Local Network Access permission;
allow it when the prompt appears. With no prompt the request fails as
`ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS`, and the giveaway is that the
browser's network tab shows the request while your server log shows nothing.

Putting the store on a real host avoids all of it, and is what you want for
sharing anyway.
""")

code("""
# Stop the server when you are done looking.
server.terminate()
server.wait(timeout=10)
print("server stopped")
""")

# ------------------------------------------------------------------- step 7

md("""
## 7. The same store, in everything else

Nothing above is Neuroglancer-specific. The store is the deliverable, and the
viewers are interchangeable:

- **napari** - `napari --plugin napari-ome-zarr results/ngff/frog-head.ome.zarr`
- **MoBIE**, **BigVolumeBrowser** - point them at the directory or its URL
- **Back into Python** - `nz.from_ngff_zarr(STORE)` gives the levels as dask
  arrays, so a level larger than memory is still something you can slice

## What to change for a volume that is actually large

This frog is 12 M voxels, which fits in memory and converts in seconds. Three
things change when it does not:

- **Chunk size.** 64³ is a reasonable default. Larger chunks mean fewer
  requests and more wasted bytes per request; smaller means the opposite
- **Levels.** Enough that the top level is a few hundred voxels across, so the
  whole-specimen view is one or two chunks
- **Reading.** Hand `to_multiscales` a dask array rather than a numpy one and
  nothing has to be in memory at once

And if the input is a vendor format rather than a TIFF, convert with
[bioformats2raw](https://github.com/glencoesoftware/bioformats2raw) instead of
reading it yourself.
""")

code("""
round_trip = nz.from_ngff_zarr(STORE)

print(f"{len(round_trip.images)} levels back out")
for i, level in enumerate(round_trip.images):
    print(f"  level {i}: {level.data.shape} {level.data.dtype} "
          f"scale {level.scale}")
""")


def main():
    out = Path(sys.argv[1] if len(sys.argv) > 1
               else "notebooks/tiff_to_ngff_and_neuroglancer.ipynb")
    out.write_text(json.dumps({
        "cells": CELLS,
        "metadata": {
            "kernelspec": {"display_name": "Python 3", "language": "python",
                           "name": "python3"},
            "language_info": {"name": "python", "version": "3.11"},
        },
        "nbformat": 4,
        "nbformat_minor": 5,
    }, indent=1) + "\n")
    print(f"wrote {out} ({len(CELLS)} cells)")


if __name__ == "__main__":
    main()
