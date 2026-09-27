#!/usr/bin/env python3
"""Rebuild notebooks/voxel_to_mesh.ipynb from the cells below.

    tools/make-voxel-to-mesh-notebook.py [out.ipynb]

Generated rather than hand-edited so the nine steps stay in one readable file
and stay in order. Run it, then execute the notebook to fill in the outputs.

The specimen is the Antscan leafcutter ant - see
`example_data/antscan-acromyrmex/CREDITS.md`. Swapping it is `VOLUME` and
`VOXEL_MM` in step 1 plus the threshold in step 2; nothing else depends on it.
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
# Voxel volumes to surface meshes

A voxel volume says how bright every point in a box is. A mesh says where a
surface is.

Getting from one to the other is a threshold and an isosurface extraction. Then
there are four steps nobody mentions until the mesh comes out wrong.

| | step | why it is there |
|---|---|---|
| 1 | Load the volume, and its voxel size | the mesh comes out in millimeters, not voxels |
| 2 | Pick a threshold | no value is the right one, and everything is downstream of it |
| 3 | Clean the mask | a threshold also selects every speck brighter than it |
| 4 | Pad with background | an object touching the edge extracts as an open surface |
| 5 | Blur the mask into a field | a 0/1 mask has nothing to interpolate, so you get a staircase |
| 6 | Extract the isosurface | the part everyone thinks is the whole job |
| 7 | Smooth the mesh | and why Taubin rather than Laplacian |
| 8 | Decimate | an order of magnitude, usually free |
| 9 | Export | STL, PLY, glTF, and which to pick |

## The specimen

A leafcutter ant worker, *Acromyrmex balzani*, scanned by synchrotron micro-CT
and published by [Antscan](https://biomedisa.info/antscan/specimen/1031) under
CC BY 4.0.

It earns the slot because its legs, antennae and hairs are a few voxels across.
Every knob below has something visible to destroy.

Source, licence and how the file was prepared:
`example_data/antscan-acromyrmex/CREDITS.md`.

Any `(z, y, x)` stack works - change `VOLUME` and `VOXEL_MM` in step 1.
""")

code("""
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pyvista as pv
import tifffile as tiff
from scipy import ndimage

pv.set_jupyter_backend("static")

OUT = Path("results") / "voxel_to_mesh"
OUT.mkdir(parents=True, exist_ok=True)

COLOR = "#bcd8ea"


def show(mesh, **kwargs):
    \"\"\"One mesh, lengthwise across a wide frame.

    The ant is 7.4 mm long and 2 mm wide, so a square render is mostly
    background. "zx" puts its long axis across the image.
    \"\"\"
    pl = pv.Plotter(off_screen=True, window_size=(1300, 620))
    pl.set_background("white")
    pl.add_mesh(mesh, color=COLOR, smooth_shading=True, **kwargs)
    pl.camera_position = "zx"
    pl.reset_camera()
    pl.camera.elevation = 18
    pl.camera.zoom(1.7)
    pl.show()


def compare(meshes, titles, width=420, zoom=1.35):
    \"\"\"Several meshes side by side, sharing one camera.

    Panels are tall and narrow, so here the ant stands upright - the opposite
    of `show`, for the same reason. Raise `zoom` to crop into the thorax, which
    is where the legs are and where damage shows.
    \"\"\"
    pl = pv.Plotter(off_screen=True, shape=(1, len(meshes)),
                    window_size=(width * len(meshes), 900))
    pl.set_background("white")
    for i, (mesh, title) in enumerate(zip(meshes, titles)):
        pl.subplot(0, i)
        pl.add_mesh(mesh, color=COLOR, smooth_shading=True)
        pl.add_text(title, font_size=10, color="black")
    pl.link_views()
    pl.camera_position = "yz"
    pl.reset_camera()
    pl.camera.zoom(zoom)
    pl.show()


def open_edges(mesh):
    \"\"\"Edges belonging to one triangle instead of two - i.e. holes.

    A closed surface has none. It is the cheapest check that an extraction went
    the way you think, and it is a number rather than a squint at a picture.
    \"\"\"
    return mesh.extract_feature_edges(
        boundary_edges=True, feature_edges=False,
        manifold_edges=False, non_manifold_edges=False,
    ).n_cells


def non_manifold_edges(mesh):
    \"\"\"Edges shared by three or more triangles.

    A surface has none of these either, and they are the failure `open_edges`
    does not catch - see step 9.
    \"\"\"
    return mesh.extract_feature_edges(
        boundary_edges=False, feature_edges=False,
        manifold_edges=False, non_manifold_edges=True,
    ).n_cells
""")

# ------------------------------------------------------------------- step 1

md("""
## 1. Load the volume, and its voxel size

Two things come out of the file: the array, and how big a voxel is.

The voxel size is the one people skip. It is why meshes turn up in the next
tool at a two-hundredth of life size, or squashed along one axis.

- This scan is **9.76 µm isotropic** - see `CREDITS.md` for where that comes from
- It is in a sidecar file, not in the TIFF, which is normal
- ImageJ-written TIFFs carry spacing; most others do not
- Check your own file rather than letting it default to 1
""")

code("""
VOLUME = Path("../example_data/antscan-acromyrmex/acromyrmex-200x196x758.tif")
VOXEL_MM = 0.00976        # 9.76 um isotropic

vol = tiff.imread(VOLUME)

print(f"shape  {vol.shape}  (z, y, x)")
print(f"dtype  {vol.dtype}, range {vol.min()}-{vol.max()}")
print(f"extent {np.round(np.array(vol.shape) * VOXEL_MM, 2)} mm")
""")

md("""
A maximum projection down each axis, to see what is in there before deciding
anything.
""")

code("""
fig, axes = plt.subplots(1, 3, figsize=(11, 4.5))
for ax, axis, name in zip(axes, (0, 1, 2), ("along z", "along y", "along x")):
    ax.imshow(vol.max(axis=axis), cmap="bone", aspect="equal")
    ax.set_title(name, fontsize=9)
    ax.axis("off")
fig.tight_layout()
plt.show()
""")

md("""
The ant is mounted in a tube, and the tube is in the scan. So are the ring
artefacts the reconstruction left behind.

Both are brighter than air, so both are candidates for any threshold you pick.
""")

# ------------------------------------------------------------------- step 2

md("""
## 2. Pick a threshold

Everything below is downstream of this number, and nothing in the data marks
the right one.

Look at the histogram first. The background swamps everything, so this drops
the zero bin and uses a log scale.
""")

code("""
counts, edges = np.histogram(vol[vol > 0], bins=96, range=(1, 255))

fig, ax = plt.subplots(figsize=(8, 2.6))
ax.fill_between(edges[:-1], counts, step="post", color=COLOR)
ax.set_yscale("log")
ax.set_xlabel("intensity (background excluded)")
ax.set_ylabel("voxels")
for level in (78, 90, 110):
    ax.axvline(level, color="#e1462c", lw=1)
    ax.text(level + 2, counts.max(), str(level), color="#e1462c", va="top", fontsize=8)
fig.tight_layout()
plt.show()
""")

md("""
There is a shoulder around 80 where the mounting medium ends, and no clean
valley after it. Unstained chitin grades into background rather than standing
apart from it.

So compare surfaces instead. The helper below is the whole notebook in one
function; the sections after it take it apart.
""")

code("""
def despeckle(mask, min_voxels):
    \"\"\"Drop connected components smaller than `min_voxels`. See step 3.\"\"\"
    labels, _ = ndimage.label(mask)
    sizes = np.bincount(labels.ravel())
    sizes[0] = 0
    return np.isin(labels, np.flatnonzero(sizes >= min_voxels))


def volume_to_mesh(volume, level, *, voxel_mm=VOXEL_MM, min_voxels=300,
                   sigma=0.9, smooth_iter=20, reduction=0.85):
    \"\"\"Steps 3 to 8, in order.\"\"\"
    mask = despeckle(volume >= level, min_voxels)
    field = ndimage.gaussian_filter(
        np.pad(mask, 1, constant_values=False).astype(np.float32), sigma)
    grid = pv.ImageData()
    grid.dimensions = np.array(field.shape[::-1])
    grid.spacing = (voxel_mm,) * 3
    grid.point_data["values"] = field.ravel(order="C")
    surf = grid.contour(isosurfaces=[0.5], scalars="values",
                        method="flying_edges")
    if smooth_iter:
        surf = surf.smooth_taubin(n_iter=smooth_iter, pass_band=0.1)
    if reduction:
        surf = surf.decimate(reduction)
    return surf


levels = [78, 90, 110]
compare([volume_to_mesh(vol, lv) for lv in levels], [f"level {lv}" for lv in levels])
""")

md("""
- **78** drags in the tube wall and the ring artefacts
- **90** holds the legs, antennae and gaster
- **110** breaks the ant into pieces - the cuticle is thin and its brightness varies along it

This notebook uses 90. Whatever you pick belongs in the methods section: a
surface is not a measurement until the threshold that made it is written down.
""")

code("""
LEVEL = 90
""")

# ------------------------------------------------------------------- step 3

md("""
## 3. Clean the mask

`vol >= LEVEL` selects the ant and every speck brighter than the threshold. Each
speck becomes its own closed surface in the mesh.

**Remove small components - not all but the largest.** Keeping only the biggest
is the usual advice and it is wrong here.
""")

code("""
mask_raw = vol >= LEVEL
_, n_before = ndimage.label(mask_raw)

MIN_VOXELS = 300
mask = despeckle(mask_raw, MIN_VOXELS)
_, n_after = ndimage.label(mask)

print(f"components: {n_before:,} -> {n_after:,}")
print(f"voxels:     {mask_raw.sum():,} -> {mask.sum():,} "
      f"({100 * mask.sum() / mask_raw.sum():.1f}% kept)")
""")

md("""
An antenna that leaves the tube, or a leg the threshold has pinched in half, is
a genuinely separate component. "Largest" throws those away and leaves you a
legless ant.

A size floor keeps them and drops the speckle.
""")

# ------------------------------------------------------------------- step 4

md("""
## 4. Pad with background

Extraction puts a surface where the threshold is *crossed*. Where the specimen
runs off the edge of the volume nothing crosses, so the surface stops and the
mesh has a hole.

This ant touches every face - legs and antennae leave the field of view. Count
the open edges with and without a one-voxel border:
""")

code("""
def extract(field, *, voxel_mm=VOXEL_MM, level=0.5):
    grid = pv.ImageData()
    grid.dimensions = np.array(field.shape[::-1])
    grid.spacing = (voxel_mm,) * 3
    grid.point_data["values"] = np.ascontiguousarray(
        field, dtype=np.float32).ravel(order="C")
    return grid.contour(isosurfaces=[level], scalars="values",
                        method="flying_edges")


unpadded = extract(mask)
padded = extract(np.pad(mask, 1, constant_values=False))

print(f"without padding: {open_edges(unpadded):>6,} open edges")
print(f"with padding:    {open_edges(padded):>6,} open edges")
""")

md("""
One voxel is enough, and `np.pad(mask, 1)` is the whole fix. An open mesh has
no inside, so its volume is undefined, boolean operations fail, and slicing it
in Blender means looking through the hole.

**Padding closes the surface. It does not recover the specimen.** The caps it
adds are flat and sit where your field of view ended, not where the ant did.

### The `ravel` order, while we are here

`pv.ImageData` wants `dimensions` in `(x, y, z)` and its points with x fastest.
An array indexed `[z, y, x]` gives exactly that under `order="C"`.

`order="F"` on a `(z, y, x)` array transposes the volume. On a roughly
symmetric specimen that looks fine, so it survives review and shows up later as
a mesh mirrored against the data.
""")

# ------------------------------------------------------------------- step 5

md("""
## 5. Blur the mask into a field

A 0/1 mask has nothing between 0 and 1. The threshold at 0.5 is crossed exactly
at a voxel face every time, so the surface lands on voxel faces.

That is the staircase, and no extraction algorithm removes it. Two ways to get
a value that varies smoothly instead:

- **Blur the mask** - one line, and what this notebook does
- **Use the gray values** - the scan already varies smoothly across an edge.
  That is partial volume, and it is real sub-voxel information rather than
  something a filter invented

Blurring is not free, and on this specimen it is expensive. A Gaussian pulls a
thin structure's peak below 0.5 before it does much to a thick one, so the legs
and antennae erode while the gaster barely changes.

**A signed distance field does nothing here, and it is worth knowing why.**
Marching cubes interpolates along grid edges only, and an edge that crosses the
surface runs from a voxel one step inside to one step outside - so the field
reads +1 and -1 whatever the distance transform computed further away, and the
crossing lands at the midpoint. That is the same vertex the binary mask gave.
Smoothing the field first does change it, and erodes thin structures faster
than blurring the mask does.
""")

code("""
SIGMA = 0.8

padded_mask = np.pad(mask, 1, constant_values=False)
voxel_volume = mask.sum() * VOXEL_MM ** 3
print(f"the mask itself encloses {voxel_volume:.3f} mm3\\n")

print(f"{'sigma':>7} {'triangles':>12} {'volume mm3':>12} {'vs mask':>9}")
for sigma in (0.0, 0.5, 0.8, 1.5, 2.5):
    field_s = (padded_mask.astype(np.float32) if sigma == 0 else
               ndimage.gaussian_filter(padded_mask.astype(np.float32), sigma))
    surf_s = extract(field_s)
    print(f"{sigma:>7.1f} {surf_s.n_cells:>12,} {surf_s.volume:>12.3f} "
          f"{100 * (surf_s.volume / voxel_volume - 1):>8.0f}%")
""")

md("""
Sigma is a real parameter, not a tidying-up step. At 2.5 the ant has lost three
quarters of its volume and most of its legs.

`0.8` is the compromise this notebook uses: enough to put vertices between
voxels, little enough that the leg segments survive.
""")

code("""
binary = extract(padded_mask)
blurred = extract(ndimage.gaussian_filter(padded_mask.astype(np.float32), SIGMA))

# The gray values, but only where the mask said there is specimen - otherwise
# contouring the scan brings back the tube and every speck step 3 removed.
# The mask chooses *what*, the gray values decide *where*.
near = ndimage.binary_dilation(padded_mask, iterations=2)
gray = extract(np.where(near, np.pad(vol, 1, constant_values=0), 0.0),
               level=float(LEVEL))

for name, surf_v in [("binary mask", binary), ("blurred", blurred),
                     ("gray values", gray)]:
    print(f"{name:<15} {surf_v.n_cells:>9,} triangles   "
          f"enclosed volume {surf_v.volume:7.3f} mm3")

compare([binary, blurred, gray], ["binary mask", "blurred mask", "gray values"])
""")

md("""
The gray values give a smooth surface at almost exactly the mask's volume. The
blur gives a smooth surface a sixth smaller.

That is the whole argument for keeping the intensities around. Smooth is not
the same as accurate, and a filter cannot add information the mask threw away.
""")

# ------------------------------------------------------------------- step 6

md("""
## 6. Extract the isosurface

`contour` with `method="flying_edges"` is marching cubes in four parallel passes
over the grid. Same surface, faster, and what VTK runs by default now.

`spacing` on the grid is what puts the result in millimeters.
""")

code("""
field = ndimage.gaussian_filter(padded_mask.astype(np.float32), SIGMA)
surf = extract(field)

print(f"{surf.n_points:,} vertices, {surf.n_cells:,} triangles")
print(f"{open_edges(surf)} open edges")
print(f"bounds (mm): {np.round(surf.bounds, 2)}")
show(surf)
""")

# ------------------------------------------------------------------- step 7

md("""
## 7. Smooth the mesh

This is a different operation from blurring the volume. It moves vertices along
the surface rather than changing where the surface is.

**Use Taubin, not Laplacian.** Laplacian smoothing pulls every vertex towards
its neighbors' average, which shrinks a closed mesh a little more on every
iteration.

Taubin alternates a shrinking pass with an expanding one. The numbers below are
the whole argument.
""")

code("""
laplacian = surf.smooth(n_iter=20, relaxation_factor=0.1)
taubin = surf.smooth_taubin(n_iter=20, pass_band=0.1)

print(f"extracted  {surf.volume:7.3f} mm3")
print(f"Laplacian  {laplacian.volume:7.3f} mm3  "
      f"({100 * (laplacian.volume / surf.volume - 1):+.1f}%)")
print(f"Taubin     {taubin.volume:7.3f} mm3  "
      f"({100 * (taubin.volume / surf.volume - 1):+.1f}%)")

smoothed = taubin
""")

md("""
On an ant the shrinkage is worse than on a blob, because the legs are thin. A
few more Laplacian iterations and they thin out and snap.
""")

# ------------------------------------------------------------------- step 8

md("""
## 8. Decimate

Extraction gives roughly a triangle per voxel the surface passes through, which
is far more than the shape needs. Decimation collapses edges cheapest-first.

On thin structures it also tears them, and PyVista gives you two methods that
fail in opposite directions:

- `decimate` - VTK's quadric decimation. Hits the triangle budget exactly, and
  will punch through a leg to get there
- `decimate_pro(preserve_topology=True)` - refuses any collapse that would
  change the topology. Stays closed, and stops early when it runs out of safe
  collapses

Watch the open-edge column rather than the volume:
""")

code("""
print(f"{'':>10}{'quadric':>26}{'pro, topology-preserving':>30}")
print(f"{'reduction':>10} {'triangles':>12} {'open':>12} {'triangles':>14} {'open':>12}")

meshes = []
for reduction in [0.5, 0.9, 0.95, 0.99]:
    quick = smoothed.decimate(reduction)
    safe = smoothed.decimate_pro(reduction, preserve_topology=True)
    print(f"{reduction:>10.2f} {quick.n_cells:>12,} {open_edges(quick):>12,} "
          f"{safe.n_cells:>14,} {open_edges(safe):>12,}")
    meshes.append(quick)

# Cropped into the thorax: at whole-ant scale every panel looks the same, and
# what decimation does to a leg is a few pixels wide.
compare([smoothed] + meshes,
        ["full", "50%", "90%", "95%", "99%"], width=300, zoom=3.4)
""")

md("""
Quadric decimation hits every budget and opens holes doing it. Topology-
preserving decimation keeps every mesh closed and then stalls - past about 90%
there are no safe collapses left on a leg two voxels thick.

**You can have the triangle budget or the watertight mesh, not both**, once the
structures are thin. Which you want depends on the destination.
""")

code("""
for reduction in [0.5, 0.9, 0.95, 0.99]:
    mesh = smoothed.decimate(reduction)
    path = OUT / f"decimated_{int(reduction * 100):02d}.stl"
    mesh.save(path)
    print(f"{path.name:<20} {mesh.n_cells:>9,} triangles  "
          f"{path.stat().st_size / 1024:>7.0f} kB")
""")

md("""
Note what is *not* in that table: enclosed volume. `mesh.volume` integrates over
a closed surface, so on a torn mesh it is not wrong so much as undefined - run
it twice and it can give two answers.

That is the reason step 4 counted open edges. It is the check that tells you
whether any measurement you take afterwards means anything.
""")

# ------------------------------------------------------------------- step 9

md("""
## 9. Export

| format | carries | use it for |
|---|---|---|
| **STL** | triangles, nothing else | printing, and tools that read nothing else |
| **PLY** | triangles, color, normals, per-vertex fields | keeping a measurement on the surface |
| **glTF** | triangles, color, materials, a scene | the browser, and `<model-viewer>` |

STL stores three full coordinates per triangle and shares nothing, so it is
roughly double the size of the same mesh in PLY. It is still what most tools
open first.
""")

code("""
# Topology-preserving, so what leaves this notebook is closed.
final = smoothed.decimate_pro(0.9, preserve_topology=True)

# Measure before writing - see the note below.
print(f"{final.n_cells:,} triangles")
print(f"{open_edges(final):,} open edges, "
      f"{non_manifold_edges(final):,} non-manifold edges")
print(f"enclosed volume {final.volume:.3f} mm3")

final.save(OUT / "acromyrmex.stl")
final.save(OUT / "acromyrmex.ply")

pl = pv.Plotter(off_screen=True)
pl.add_mesh(final, color=COLOR)
pl.export_gltf(OUT / "acromyrmex.gltf")
pl.close()

print()
for path in sorted(OUT.glob("acromyrmex.*")):
    print(f"{path.name:<20} {path.stat().st_size / 1024:>8.0f} kB")

print(f"\\nvolume after writing: {final.volume:.3f} mm3")
show(final)
""")

md("""
### Closed is necessary, not sufficient

The mesh above has no open edges and still has thousands of **non-manifold**
ones - edges where three or more triangles meet, which is what topology-
preserving decimation produces instead of a hole.

`mesh.volume` is not defined on a surface like that. The last two lines print
the same attribute before and after writing the files and get different
answers, because the STL writer reorders points and the integral follows.

So: measure first, write second. And check both edge counts, not just the one.
""")

md("""
## Where this goes next

- **Blender** - the [mesh rendering](https://ida-mdc.github.io/workshop-visualization/2026-workshop/mesh-rendering-blender/)
  and [mesh cutting](https://ida-mdc.github.io/workshop-visualization/2026-workshop/mesh-cutting-blender/)
  tutorials start from an STL like this one
- **The browser** - drop the glTF into [`<model-viewer>`](https://modelviewer.dev)
- **MeshLab** - quadric edge collapse with more control than `decimate`, and
  repair for meshes that arrived from somewhere less careful

## The five things that go wrong

1. **Voxel size left at 1** - right shape, wrong units
2. **No padding** - the surface is open wherever the specimen touched the edge
3. **Binary mask straight into marching cubes** - a staircase, blamed on the algorithm
4. **Laplacian smoothing** - the mesh shrinks quietly and the volume is wrong
5. **`order="F"` on a `(z, y, x)` array** - the volume is transposed, and on a
   symmetric specimen nothing looks wrong until it is compared with the data

And one that is specific to specimens like this one: **decimating thin
structures tears them**. Count open edges after, not before.
""")


def main():
    out = Path(sys.argv[1] if len(sys.argv) > 1 else "notebooks/voxel_to_mesh.ipynb")
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
