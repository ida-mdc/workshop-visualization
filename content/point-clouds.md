---
title: "Pointcloud Showcase"
date: 2025-09-17
draft: false
type: page
layout: workshop
author: Deborah Schmidt
author_position: Head of Helmholtz Imaging Support Unit, MDC Berlin
cover: img/bessy-beamline-video.png
---

## Point cloud data
### Positions, and nothing joining them

{{< notes >}}
Pull the density down. The surface stops existing - there is no geometry
underneath to fall back on, the way a decimated mesh still has faces.

Now leave the density low and turn the splat size up instead. It looks solid
again, and it carries exactly as little information as before. That is the thing
to be suspicious of in anyone's point cloud figure, including your own: a large
splat radius is how a sparse cloud is made to look dense.
{{< /notes >}}

- **No connectivity** - so a surface has to be *reconstructed* (Poisson, ball pivoting, alpha shapes) if you need one
- **Noisy and redundant** - filter, align between scans, downsample, and normalise intensities before you trust a measurement

{{< scene name="point-cloud" height="420" caption="Density and splat size are independent. Only one of them is data." >}}

---

## Point cloud data
### How a point cloud gets drawn

{{< notes >}}
There is no surface to rasterize, so each point is drawn on its own and the
surface is whatever the eye makes of the result. The cheapest version is one
screen-aligned square per point, a fixed number of pixels wide. Give the point
a radius in world units instead and it shrinks with distance, which is what
makes a cloud read as being in space.

A point has no normal unless the scanner or a reconstruction step gave it one,
so there is nothing to light. Color comes from an attribute: intensity,
classification, RGB from a camera, or height. Eye-dome lighting gets shape back
without normals - it compares each pixel's depth with its neighbors' and
darkens the places where the depth jumps, so edges and crevices come out.
{{< /notes >}}

{{< horizontal >}}

{{< block >}}
**One primitive per point**
- **Screen-aligned square** - a fixed number of pixels, the cheapest thing a GPU does
- **Camera-facing disc** - a radius in world units, so it shrinks with distance
- **Oriented ellipse** - needs a normal per point; overlapping ellipses blend into a surface
{{< /block >}}

{{< block >}}
**Where the color and the shape come from**
- Color is an **attribute**: intensity, classification, RGB, elevation
- No normals → **nothing to light**
- **Eye-dome lighting** darkens depth jumps between neighboring pixels, and the shape comes back
{{< /block >}}

{{< /horizontal >}}

- The **splat radius** is a display setting. It closes holes without adding a single point

{{< citations >}}
- Surface splatting: [Zwicker, Pfister, van Baar & Gross (2001)](https://doi.org/10.1145/383259.383300), SIGGRAPH · Eye-dome lighting: [Boucheny (2009), CEA](https://tel.archives-ouvertes.fr/tel-00438464), as implemented in [Potree](https://github.com/potree/potree) and CloudCompare
{{< /citations >}}

---

## Point cloud data
### Do it yourself: clean, then reconstruct

{{< notes >}}
This is the notebook for the two bullets on the first slide - the filtering
and the reconstruction a cloud needs before it is worth measuring.

The order matters and it is the thing to say. Radius outlier removal before
normal estimation, because one stray point bends the plane fit for every
neighbour it has; normals before reconstruction, because Poisson has nothing
to work with without them.

It runs on a synthetic noisy sphere so nobody is blocked on having data. Point
it at `example_data/spiral_tube_pointcloud.ply` to use ours.
{{< /notes >}}

{{< horizontal >}}

{{< block >}}
1. **Drop** NaNs and duplicates
2. **Voxel downsample** - one point per cell
3. **Radius outlier removal** - drop points with too few neighbours
4. **Estimate normals** - PCA on each point's *k* nearest
5. **Reconstruct** a surface, and save PLY
{{< /block >}}

{{< block >}}
```bash
uv venv .venv --python 3.11
uv pip install --python .venv \
  "pyvista[all]" scipy jupyterlab
uv run --python .venv jupyter lab
```

[point_clouds_tutorial.ipynb](https://github.com/ida-mdc/workshop-visualization/blob/main/notebooks/point_clouds_tutorial.ipynb)

{{< qr-code identifier="nb-point-clouds" link="https://github.com/ida-mdc/workshop-visualization/blob/main/notebooks/point_clouds_tutorial.ipynb">}}
{{< /block >}}

{{< /horizontal >}}

- **Clean before you reconstruct** - one outlier bends the normals of every neighbour it has
- No normals → **no Poisson surface**, and nothing to light

---

## Project BESSY2 Reconstruction

{{<horizontal>}}
### Helmholtz Imaging Collaboration with Jan-Simon Schmidt (HZB)

{{<block style="margin-right: 40px">}}
{{<figure src="img/logos/dkfz.png" height="50px" class="image-right">}}
{{<figure src="img/logos/hzb-logo-a4-rgb.jpg" height="80px" class="image-right">}}
{{</block>}}

{{</horizontal>}}
<div style="margin-left: 40px; font-size: 60%">Jan-Simon Schmidt (HZB), Ole Johannsen (DKFZ, Helmholtz Imaging), Deborah Schmidt (MDC, Helmholtz Imaging)</div>

{{< notes >}}
Experiments in BESSY II change regularly, making tracking those changes - e.g. for planning additional experiments - necessary. Common surveying techniques are laborious and offer unneeded accuracy. Thus, we provide a pragmatic solution where the status quo is reconstructed from drone video footage. The resulting 3D reconstruction can be rendered from above using orthogonal projection. Overlaying this rendering with the original 2D plans gives valuable information about the differences between the status quo and the theoretical plans.
{{< /notes >}}

{{<figure src="img/bessy2-top.jpg" style="max-height: 29vh; width: auto">}}

---

## Project BESSY2 Reconstruction
### Workflow & Tools

* Extract point clouds from frames of drone video footage
* **Clean & rotate, and merge point clouds** (using *CloudCompare*)
* **Render results in Blender** for inspection & visualization
* **Integrate room layout** by converting SVG file to Mesh & import it in Blender
* **Convert to Potree format** (multi resolution)
* **Upload to public server** → Accessible in browser with **Potree** (open-source WebGL based point cloud renderer for large point clouds)

---

{{< cover src="img/bessy-beamline-video.png" background="black" color="white" title="Blender fly-through" >}}

{{< /cover >}}

---

{{< cover src="img/bessy-beamline-floorplan.png" background="white" color="black" title="Floor plan" >}}

{{< /cover >}}

---

{{< cover src="img/bessy-beamline-floor-render.png" background="black" color="white" title="Blender floor" >}}

{{< /cover >}}


---

{{< cover src="img/bessy-beamline-potree.png" background="black" color="white" title="Potree / Entwine-generated EPT format" >}}

{{< /cover >}}


---

## Large point clouds
### Where the size comes from


{{< notes >}}
A point is 20 to 34 bytes, and a survey holds hundreds of millions of them.

What makes a plain LAS slow is not its size but the absence of a spatial
index: locating the points in one corner means reading all of them.
{{< /notes >}}

- A point is **20 to 34 bytes** - position, intensity, classification, often color and GPS time
- **No connectivity**, so nothing to decimate: the only move is leaving points out
- **No spatial index in LAS/LAZ** - finding the points in a region means reading all of them, which is what the conversion fixes

---

## Large point clouds
### How Potree works

{{< notes >}}
PotreeConverter builds an octree over the cloud and writes three files rather
than millions.

What goes in a node: one point per cell of a lattice over that node's box, and
only points no ancestor already took. So a node is a sample of its own region
at its own resolution, and a node together with its ancestors is that region at
full density. A viewer can stop descending anywhere and get a complete picture,
coarser, and it never re-fetches a point it already has.

The viewer starts at the root and repeatedly draws whichever pending node looks
biggest from the camera - its box size over its distance - then queues that
node's children. The point budget runs out while the far nodes are still
shallow. What you end up drawing is a cut through the tree, deep near the
camera and shallow at the horizon.

In the scene the boxes are the nodes being drawn and their color is the depth.
Switch to **Same depth** to see the alternative: every region at one resolution,
the far ones carrying detail nobody can see.
{{< /notes >}}

{{< scene name="point-lod" height="520" hint="drag to rotate" caption="" >}}

- A node holds the points **no ancestor already took** - node plus ancestors is the region at full density
- The viewer descends into whatever looks **biggest on screen** until the point budget is spent
- Three files: **`metadata.json`**, **`hierarchy.bin`**, **`octree.bin`** - not millions of small ones
- Served from **any static host** with range requests

{{< citations >}}
- [Potree](https://github.com/potree/potree) · [PotreeConverter](https://github.com/potree/PotreeConverter) · [Schütz (2016), Potree: Rendering Large Point Clouds in Web Browsers, TU Wien](https://www.cg.tuwien.ac.at/research/publications/2016/SCHUETZ-2016-POT/)
{{< /citations >}}

---

## Large point clouds
### Converting and hosting

{{< notes >}}
EPT and Potree's octree are directory trees. COPC packs the same octree into a
single LAZ file read with range requests, which makes it the better choice for
new data.

BESSY II was reconstructed from drone video, cleaned in CloudCompare and
served with Potree.
{{< /notes >}}

{{< horizontal >}}

{{< block >}}
- [**PotreeConverter**](https://github.com/potree/PotreeConverter) - LAS/LAZ in, Potree octree out
- [**Entwine**](https://entwine.io/) - EPT, a directory tree
- [**COPC**](https://copc.io/) - the same octree in one LAZ file, read with range requests. Prefer it for new data
- **CloudCompare** for cleaning, aligning and merging first
{{< /block >}}

{{< figure src="img/bessy-beamline-potree.png" style="max-height: 32vh; width: auto" caption="BESSY II, reconstructed from drone footage and served with Potree" >}}

{{< /horizontal >}}

<div style="font-size: 60%">Jan-Simon Schmidt (HZB), Ole Johannsen (DKFZ, Helmholtz Imaging), Deborah Schmidt (MDC, Helmholtz Imaging)</div>

---

## Large point clouds
### Do it yourself: convert

{{< notes >}}
Two containers, no installs. PDAL reads PLY, XYZ, E57, LAS and about thirty
other things and writes LAS; Entwine turns that into the octree.

COPC is the same octree packed into one LAZ file. One command instead of two,
one file instead of a directory, and it needs a server that answers byte-range
requests.

A cloud of a couple of hundred thousand points comes out as a two-level tree -
Entwine's default node resolution already holds most of it in the root. The
hierarchy starts earning its keep in the hundreds of millions.
{{< /notes >}}

**Anything → LAS → EPT octree**

```bash
# 1 · whatever you have → LAS
docker run --rm -v "$PWD:/data" pdal/pdal   pdal translate /data/cloud.ply /data/cloud.las

# 2 · LAS → EPT, the octree Potree walks
docker run --rm -v "$PWD:/data" connormanning/entwine   build -i /data/cloud.las -o /data/ept --threads 8
```

- Or with conda: `mamba create -n ept -c conda-forge entwine pdal`, then the same two commands without the `docker run` wrapper
- **One file instead of a directory:** `pdal translate cloud.ply cloud.copc.laz` - same octree, packed into one LAZ, read with byte ranges
- Try it on `example_data/spiral_tube_pointcloud.ply`

{{< citations >}}
- [PDAL](https://pdal.io/) · [Entwine](https://entwine.io/) · [COPC](https://copc.io/)
{{< /citations >}}

---

## Large point clouds
### Do it yourself: host and open

{{< notes >}}
The server has to send `access-control-allow-origin`, or the viewer stays
empty while curl works fine. The one in this repository does. It does not
answer byte-range requests, so it serves EPT but not COPC.

Then the catch, and it is new. Chrome 142 added Local Network Access: a page
on a public https origin asking for something on 127.0.0.1 needs permission
first. Allow it when the prompt appears. If there is no prompt the request
fails with `ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS` and nothing reaches
your server at all - the network tab shows the request, your server log does
not.

Putting the data on a real host sidesteps all of it, and is what you want for
sharing anyway.
{{< /notes >}}

```bash
# 3 · serve the directory containing ept/, with CORS
python example_data/server.py -d . -p 8123
```

**4 · open it in the Helmholtz Imaging Potree instance**

```
https://ida-mdc.gitlab.io/potree-launcher/?dataUrl=http://127.0.0.1:8123/ept/ept.json
```

- The launcher takes any `dataUrl`: EPT `ept.json`, Potree `cloud.js` / `metadata.json`, or a COPC `.laz`
- **Chrome 142 and up** asks permission before a public page may read from `127.0.0.1`. Denied or unprompted, it fails with `ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS` and your server never sees the request
- `server.py` sends CORS but **no byte ranges** - fine for EPT, not enough for COPC
- Host it for real → the same URL works for everyone, which is what BESSY II does

{{< citations >}}
- [Potree launcher](https://ida-mdc.gitlab.io/potree-launcher/) · [`server.py`](https://github.com/ida-mdc/workshop-visualization/tree/main/example_data/server.py) · [Local Network Access, Chrome for Developers](https://developer.chrome.com/blog/local-network-access)
{{< /citations >}}