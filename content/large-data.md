---
title: Large 3D Data
date: 2026-09-25
draft: false
layout: workshop
type: page
author: Deborah Schmidt
author_position: Helmholtz Imaging | MDC Berlin
description: How to handle large 3D datasets for visualization tasks.
cover: img/bvv-magic.png
---

## Large 3D Data

{{< notes >}}
Four different walls, and it is worth knowing which one you hit. Disk and the
network are about keeping and moving the data; RAM and graphics memory are
about drawing it.

The three strategies on the right are the rest of this session, in order. They
stack: a layout is what makes streaming possible, and a fit makes both cheaper.
{{< /notes >}}

{{< horizontal >}}

{{< block >}}
**Too large for what**
- **Disk** - the raw scan, the converted copy and its pyramid all have to live somewhere
- **RAM** - out-of-core: too big to read in one go
- **Graphics memory** - a card has 8 to 24 GB
- **The network** - it sits on a server, so every byte you look at has to cross the wire before you see it
{{< /block >}}

{{< block >}}
**Three ways out**
1. **Layout** - store it so a reader can take just the pieces it needs
2. **Streaming** - move only the pieces that are on screen
3. **A cheaper representation** - fit the data and ship the fit
{{< /block >}}

{{< /horizontal >}}

- Only the third one shrinks what you **store**. The first two make a large dataset usable where it already is

---

## 1 · Layout
### What each storage layout has to read

{{< notes >}}
One 1024³ uint16 volume, 2.1 GB, stored four ways. The readout says what each
layout has to read for the request you pick.

The two slices are the pair to compare. Plane per file is the cheapest layout
for an xy slice and the most expensive for an xz one, because every plane
contributes one row to it.
{{< /notes >}}

{{< scene name="chunk-fetch" height="430" hint="drag to turn" caption="The same 2.1 GB volume, four layouts. Only what has to be read changes." >}}

---

## 1 · Layout
### Which formats can be read in pieces

{{< notes >}}
A format can be read in pieces when it has three things: a chunk or tile grid,
a set of resolution levels, and metadata describing both.

The extension says nothing about it. A tiled OME-TIFF with sub-resolutions has
all three, and a plain TIFF stack has none.
{{< /notes >}}

{{< horizontal >}}

{{< block >}}
**Read in pieces**
- **OME-Zarr** - the default for new data
- **N5**, **HDF5** - chunked; HDF5 keeps it all in one file
- **Neuroglancer precomputed**
- **Pyramidal OME-TIFF** - tiled, with sub-resolutions
{{< /block >}}

{{< block >}}
**Read whole**
- A **plain TIFF stack** - strips, one resolution
- **NIfTI**, **`.npy`**, **raw**
- Any file whose middle is reached by reading from the start
{{< /block >}}

{{< /horizontal >}}

- The three things that make the difference: a **chunk or tile grid**, **resolution levels**, and **metadata** describing both
- TIFF can have all three - `raw2ometiff` writes a tiled OME-TIFF pyramid, and BigTIFF lifts the 4 GB file size limit

{{< citations >}}
- [OME-NGFF spec](https://ngff.openmicroscopy.org/latest/) · [Moore et al. (2021), Nat Methods 18, 1496–1498](https://doi.org/10.1038/s41592-021-01326-w) · [raw2ometiff](https://github.com/glencoesoftware/raw2ometiff) · [OME-TIFF sub-resolutions](https://docs.openmicroscopy.org/ome-model/latest/ome-tiff/specification.html)
{{< /citations >}}

---

## 1 · Layout
### Writing a chunked, multi-resolution copy

{{< notes >}}
Each route writes a chunked, multi-resolution copy of the same data.

MoBIE is the shortest path from an image already open in Fiji: adding it to a
project writes OME-Zarr, metadata included.
{{< /notes >}}

| From | Use | Writes |
|---|---|---|
| Vendor microscope formats | [`bioformats2raw`](https://github.com/glencoesoftware/bioformats2raw) | OME-Zarr |
| A numpy array in Python | [`ngff-zarr`](https://github.com/thewtex/ngff-zarr), [`ome-zarr-py`](https://github.com/ome/ome-zarr-py) | OME-Zarr |
| Already in Fiji | [**MoBIE**](https://mobie.github.io) → *Create → new project*, then **Add** the open image | OME-Zarr or BDV-N5, metadata included |
| Multi-tile acquisitions | [BigStitcher](https://imagej.net/plugins/bigstitcher/define-new-dataset) | N5 / HDF5 / OME-Zarr |
| For Neuroglancer | [`cloud-volume`](https://github.com/seung-lab/cloud-volume), [`igneous`](https://github.com/seung-lab/igneous) | precomputed |

- MoBIE also installs *Plugins → BigDataViewer → OME ZARR*, which opens one straight from a URL

---

## 1 · Layout
### Checking the metadata

{{< notes >}}
The validator reads an OME-Zarr at a URL and checks it against the
specification. It reports the version, the axes, the resolution levels and the
chunk grid.

A viewer that opens a URL and shows nothing has its reason on this page.
{{< /notes >}}

{{< horizontal >}}

{{< block >}}
- [**ome-ngff-validator**](https://ome.github.io/ome-ngff-validator/) takes a URL and checks it against the spec
- Reports the **version, axes, levels, chunk grid, dtype**
- Works on anything reachable - including `http://localhost:8082`
- Lists which viewers will open it, with a link that opens it there
{{< /block >}}

{{< figure src="img/ngff-validator.png" style="max-height: 46vh; width: auto" >}}

{{< /horizontal >}}

---

## 1 · Layout
### A grid for volumes, a tree for everything else

{{< notes >}}
A volume is dense. Every voxel exists, so a regular chunk grid fits it exactly
and finding a chunk is arithmetic.

A point cloud or a surface is sparse and uneven. A regular grid over one gives
mostly empty chunks and a few overloaded ones, so these formats subdivide a
cell into eight only where there is something to hold. That is an octree, and
it is why Potree has one and BigVolumeViewer does not.

Drawing one is a single walk: descend while the node is still large on screen,
stop when it is small enough.
{{< /notes >}}

{{< horizontal >}}

{{< block >}}
**Dense → a grid**
- Every voxel exists, so every chunk is the same size
- Finding a chunk is **arithmetic** - there is no index to walk
- The resolution levels are **separate downsampled copies**
- OME-Zarr, N5, precomputed, BigVolumeViewer
{{< /block >}}

{{< block >}}
**Sparse → an octree**
- Subdivide a cell into eight **only where there is data**
- Each node carries a **sample** of what is below it, so a node is already a picture
- **Depth is the resolution level** - no separate copies
- COPC, EPT, Potree, 3D Tiles, Nexus
{{< /block >}}

{{< /horizontal >}}

---

## 2 · Layout, used
### BigVolumeViewer

{{< notes >}}
BigVolumeViewer renders volumes on the GPU that do not fit in graphics memory.
It reads the resolution pyramid BigDataViewer already builds and loads blocks
on demand.

The cover of this deck was rendered with it.
{{< /notes >}}

{{< horizontal >}}

{{< block >}}
- **GPU volume rendering** of datasets larger than GPU memory
- Reads the **pyramid BigDataViewer built** - N5, HDF5, OME-Zarr
- **Picks a resolution level per view**, loads blocks on demand
- Three render methods - **maximum intensity**, **volumetric**, **surface** (the **O** key)
- **BigVolumeBrowser** adds meshes and point clouds on top
{{< /block >}}

{{< figure src="img/bvb-ant.png" style="max-height: 42vh; width: auto" caption="BigVolumeBrowser, with a synchrotron scan of the trap-jaw ant *Odontomachus assiniensis*" >}}

{{< /horizontal >}}

{{< citations >}}
- [BigVolumeViewer](https://github.com/tpietzsch/jogl-minimal) · [BigVolumeBrowser](https://imagej.net/plugins/bigvolumebrowser), Eugene Katrukha (Utrecht) · cover: [*Ceratophrys ornata*](https://doi.org/10.5061/dryad.066mr), Kleinteich & Gorb, CC0
- Ant: [Antscan](https://www.antscan.info) CASENT0744969 · [Katzke *et al.* (2026)](https://doi.org/10.1038/s41592-026-03005-0), Nat Methods 23, 663
{{< /citations >}}

---

## 2 · Layout, used
### BigVolumeViewer keeps a cache of blocks

{{< notes >}}
No octree. It holds a GPU cache of small blocks, each one block of the volume
at one level of the pyramid, evicted least-recently-used, plus a lookup texture
saying where each block currently sits.

Every block asks for the level its distance to the camera calls for. Until that
level arrives it is drawn from the coarsest data that has, and the frame is
repainted until every block has what it asked for. That is the blur that
sharpens. Nothing schedules a coarse-to-fine pass over the whole volume.
{{< /notes >}}

{{< scene name="bvv-blocks" height="420" caption="Near the camera, fine blocks; further out, coarse. Drag *blocks arrived* to watch each one climb to the level its distance asked for." >}}

{{< citations >}}
- Günther, Pietzsch *et al.* (2019), [*scenery: Flexible Virtual Reality Visualization on the Java VM*](https://arxiv.org/abs/1906.06726), §3.2 · [`VolumeBlocks.java`](https://github.com/bigdataviewer/bigvolumeviewer-core/blob/master/src/main/java/bvv/core/render/VolumeBlocks.java) - `assignBestLevels` and `makeLut`
{{< /citations >}}

---

## 2 · Layout, used
### The BigDataViewer family

{{< notes >}}
BigDataViewer is a viewer core - a resolution pyramid plus a cache - that other
programs are built on.

Everything in the table reads the same N5, HDF5 and OME-Zarr files, so one
conversion serves all of them.
{{< /notes >}}

| Viewing | Working on the data |
|---|---|
| **BigDataViewer** - arbitrary re-slicing of terabyte volumes | **BigStitcher** - stitching and registering multi-tile acquisitions |
| **BigVolumeViewer** - GPU volume rendering of the same pyramid | **BigWarp** - landmark-based registration between two datasets |
| **BigVolumeBrowser** - volumes, meshes and point clouds together | **Paintera**, **Labkit** - painting and proofreading big segmentations |
| **MoBIE** - sharing multi-modal projects, including remote ones | **Mastodon** - cell tracking through large time-lapses |
| **BDV Playground** - wiring sources together from a script | **BigTrace** - tracing vessels, neurites, filaments |

{{< citations >}}
- [BigDataViewer on imagej.net](https://imagej.net/plugins/bdv/) · [Pietzsch et al. (2015), BigDataViewer, Nat Methods 12(6), 481–483](https://www.nature.com/articles/nmeth.3392)
{{< /citations >}}

---

## 2 · Layout, used
### Installing the ones you will use today

{{< notes >}}
BigDataViewer and BigWarp are already in a stock Fiji. The three tools below
each have their own update site, and all three are ticked in the same dialog
in one pass.

Paintera is a separate application with its own installer.

BigVolumeBrowser opens its rendering parameters dialog the first time it runs
on a machine, and that is where the GPU memory budget is set. Less than the
card has: the operating system needs some too.
{{< /notes >}}

1. **Install** - *Help → Update → Manage Update Sites*, tick **BigVolumeBrowser**, **BigStitcher** and **MoBIE**, *Apply and Close*, restart
2. **Launch** - *Plugins →* the tool, or type its name in the search bar
3. **Open data** - a URL or a local path; OME-Zarr and N5 for the streaming tools
4. **BigVolumeBrowser only** - set the GPU memory in the *3D rendering parameters* dialog that opens on first launch; `F10` reopens it, `Ctrl+P` hides the card panel
5. **MoBIE only** - *Plugins → MoBIE → Create → Create new MoBIE project*, then add a dataset and a source

{{< horizontal >}}

{{< block >}}
- **BigDataViewer** and **BigWarp** are already in Fiji, with no update site to tick; **Paintera** is not a Fiji plugin at all
{{< /block >}}

{{< figure src="img/bvb-first-launch.png" style="max-height: 10vh; width: auto" caption="What step 4 looks like" >}}

{{< /horizontal >}}

{{< citations >}}
- [BigVolumeBrowser wiki](https://github.com/UU-cellbiology/bigvolumebrowser/wiki) · [MoBIE](https://mobie.github.io/) · [Pape et al. (2023), Nat Methods 20, 475–476](https://doi.org/10.1038/s41592-023-01776-4) · [Paintera](https://github.com/saalfeldlab/paintera)
{{< /citations >}}

---

## 2 · Layout, used
### Point clouds spend a fixed budget per frame

{{< notes >}}
Every node of the octree holds its points in a fixed shuffled order, so the
first n of a node are a valid sample of that node at any n. That is what lets a
viewer draw a node at whatever detail it can afford.

Both modes draw the same number of points. They differ only in where they spend
them, and spending by distance is what makes the near ground solid while the
horizon stays sketchy.
{{< /notes >}}

{{< scene name="point-lod" height="470" hint="drag to rotate" caption="The outlines are the octree. The same budget of points, spent evenly and spent by distance." >}}

{{< citations >}}
- [Potree](https://github.com/potree/potree) · [PotreeConverter](https://github.com/potree/PotreeConverter) · [Schütz (2016), *Potree: Rendering Large Point Clouds in Web Browsers*, TU Wien](https://www.cg.tuwien.ac.at/research/publications/2016/SCHUETZ-2016-POT/) · [COPC](https://copc.io) · [Entwine / EPT](https://entwine.io/)
{{< /citations >}}

---

## 2 · Layout, used
### Meshes, and the meshes that are born adaptive

{{< notes >}}
A surface mesh is made smaller after the fact: decimate it, or cut it into
fragments with coarser stand-ins and stream those. Compression is a third axis -
Draco and meshopt shrink the file and leave it just as unstreamable.

A simulation mesh is the other way round. It is adaptive from the start, refined
where the solution needs it, and t8code is the Helmholtz library for exactly
that - a forest of octrees indexed along a space-filling curve.

Coloring a t8code mesh by refinement level in ParaView shows the adaptivity
itself, which is the thing worth looking at.
{{< /notes >}}

{{< horizontal >}}

{{< block >}}
**A surface you already have**
- **Fewer triangles** - decimate; quadric edge collapse before anything cruder
- **Fewer at a time** - 3D Tiles, Nexus, Neuroglancer multi-resolution meshes: the octree again, one fragment per node
- **Smaller bytes** - Draco, meshopt. A different axis from level of detail
{{< /block >}}

{{< block >}}
**A mesh from a simulation**
- [**t8code**](https://dlr-amr.github.io/t8code/) (DLR) - adaptive mesh refinement over a **forest of octrees**: hex, tet, prism, pyramid
- Elements ordered along a **space-filling curve**, which is what makes them cheap to partition across ranks
- Run to **1.1 trillion elements** on a million cores
- Writes **`.pvtu`** for ParaView, tagging each element with its refinement level and MPI rank
{{< /block >}}

{{< /horizontal >}}

{{< citations >}}
- [t8code](https://github.com/DLR-AMR/t8code), GPLv2, DLR · Holke et al. (2023), [*t8code v1.0*](https://elib.dlr.de/194377/), SIAM IMR · [`T8code.jl`](https://github.com/DLR-AMR/T8code.jl)
- [3D Tiles](https://www.ogc.org/standard/3dtiles/) · [Nexus](https://vcg.isti.cnr.it/nexus/) · [meshoptimizer](https://github.com/zeux/meshoptimizer) · [Draco](https://github.com/google/draco)
{{< /citations >}}

---

## 3 · Streaming
### How a browser opens a terabyte

{{< notes >}}
A browser viewer never downloads the dataset. It reads the metadata, works out
which chunks the current view needs, and fetches those over HTTP.

A web map does the same thing: it loads the tiles on screen, and the rest of
the world stays on the server.
{{< /notes >}}

{{< horizontal >}}
{{< center >}}
```mermaid
---
config:
  flowchart:
    wrappingWidth: 255
---
flowchart LR
  M@{ img: "{{< u "icons/stream/metadata.svg" >}}", label: "Read the metadata", pos: "b", w: 92, h: 92 }
  C@{ img: "{{< u "icons/stream/pick-chunks.svg" >}}", label: "Pick the chunks in view", pos: "b", w: 92, h: 92 }
  G@{ img: "{{< u "icons/stream/http-get.svg" >}}", label: "Fetch them over HTTP", pos: "b", w: 92, h: 92 }
  U@{ img: "{{< u "icons/stream/gpu-upload.svg" >}}", label: "Upload them to the GPU", pos: "b", w: 92, h: 92 }
  D@{ img: "{{< u "icons/stream/sharpen.svg" >}}", label: "Draw what has arrived", pos: "b", w: 92, h: 92 }
  M --> C
  C --> G
  G --> U
  U --> D
```
{{< /center >}}
{{< /horizontal >}}

- The metadata comes first: **chunk grid, resolution levels, data type**
- One **HTTP GET** per chunk, or a byte range into one file
- The server returns bytes - no database, no application, no rendering
- A view arrives **coarse and sharpens** as finer levels land
- Move the camera and the loop runs again, from step two

---

## 3 · Streaming
### Neuroglancer

{{< notes >}}
Neuroglancer streams chunks over HTTP and writes the whole view state into the
URL, so a view is shared as a link.

It reads precomputed, N5 and Zarr, and carries segmentations and annotations as
layers on top of the image.
{{< /notes >}}

{{< horizontal >}}

{{< block >}}
- Streams **Zarr / OME-Zarr, N5, precomputed** over HTTP
- **Segmentations and annotations** as layers on the image
- **The view lives in the URL** - sharing a view is sending a link
- Runs entirely in the page; there is no server to install
{{< /block >}}

{{< figure src="img/neuroglancer-treier3.png" style="max-height: 34vh; width: auto" >}}

{{< /horizontal >}}

{{< citations >}}
- [Neuroglancer, Google Connectomics](https://github.com/google/neuroglancer) · [H01, 1.4 PB of human cortex](https://h01-release.storage.googleapis.com/landing) · [MICrONS Explorer](https://www.microns-explorer.org/)
- Mouse brains: Treier AC, Klasen C, Kramer M, Schmidt D, Block F, Gebhardt J, Rojas Rusak F, Farooqi IS, Treier M. [*A human missense variant in BSX decouples circadian behaviour from metabolic rhythmicity while preserving lifespan in mice*](https://doi.org/10.1101/2025.12.05.692520), bioRxiv 2025.12.05.692520
{{< /citations >}}

---

## 3 · Streaming
### Other browser viewers

{{< notes >}}
All of these read chunked, multi-resolution data served with CORS. They differ
in what they are built around.

Neuroglancer is built around segmentations, webKnossos around collaborative
annotation, Viv around multiplexed microscopy.
{{< /notes >}}

{{< tools kind="browser" limit="6" >}}

---

## 3 · Streaming
### What a viewer needs from the server

{{< notes >}}
A static file host is a server that returns the bytes of a file at a URL. No
database, no application server, no rendering on the server side.

Two headers decide whether a browser viewer can use it, and one `curl -I` shows
both.
{{< /notes >}}

{{< horizontal >}}

{{< block >}}
**Two headers have to be right**
- **`access-control-allow-origin`** (CORS) - a browser reads a file from another host only when the response carries it. Without it `curl` works and the viewer stays empty
- **`accept-ranges: bytes`** - lets a viewer ask for part of a file. Needed by COPC, zipped Zarr and Potree's `octree.bin`
{{< /block >}}

{{< block >}}
**Where to put the data**
- **dCache / InfiniteSpace** at DESY, through HIFIS - no size limit, can be public
- **S3** or **Google Cloud Storage** - set the bucket's CORS policy
- **[BioImage Archive](https://www.ebi.ac.uk/bioimage-archive/)** - for published data
- Your own machine - `python server.py -d <dir>`, port 8082, CORS open
{{< /block >}}

{{< /horizontal >}}

```bash
curl -I https://your-host.org/my-dataset.ome.zarr/.zattrs   # look for the two headers
```

{{< citations >}}
- [HIFIS dCache documentation](https://hifis.net/doc/cloud-services/Storage_DESY/) · [hifis-storage.desy.de](https://hifis-storage.desy.de/) · [`server.py`](https://github.com/ida-mdc/workshop-visualization/tree/main/example_data/server.py), from the Neuroglancer repository
{{< /citations >}}

---

## 4 · A cheaper representation
### luxar fits the volume and ships the fit

{{< notes >}}
luxar fits the intensity field with a sparse set of oriented Gaussians and
ships those. Empty space costs nothing, because a fit spends parameters only
where there is signal.

The sunflower is a micro-CT scan from Zenodo, 3.06 G voxels, halved on every
axis and then fitted here. Both pictures are the same projection; the right
one is drawn from the splats alone.

Two things to know before trying it. Fitting needs the CUDA kernels compiled
with `make build-cuda` - the PyTorch fallback is orders of magnitude slower.
And mask the background to zero first, or the fit spends splats describing an
empty specimen holder.
{{< /notes >}}

{{< horizontal >}}

{{< block >}}
- Fits the volume with **oriented Gaussian splats** and ships those
- Empty space costs **nothing** - parameters go where the signal is
- `fit` → `lod` → `convert`, then **any static host** serves it
- Fitting wants an **NVIDIA GPU**; 28 minutes on a laptop card
- An approximation - **measurements belong on the voxels**
{{< /block >}}

{{< figure src="img/luxar-sunflower.png" link="https://doi.org/10.5281/zenodo.15684909" target="_blank" style="max-height: 40vh; width: auto" caption="A sunflower head by micro-CT, and the same head drawn from its fit. [Get the scan](https://doi.org/10.5281/zenodo.15684909)" >}}

{{< /horizontal >}}

{{< citations >}}
- [luxar](https://github.com/royerlab/luxar) · [docs](https://royerlab.github.io/luxar/) · [the paper](https://doi.org/10.5281/zenodo.22912049) · [88 live scenes](https://demos.luxarviewer.dev) with nothing to install
- Sunflower: Chitwood, Quigley & Frank, [*X-ray CT Botanical Images*](https://doi.org/10.5281/zenodo.15684909), Zenodo 2025, CC BY 4.0 · [preparation script](https://github.com/ida-mdc/workshop-visualization/blob/main/tools/make-sunflower-splats.py)
{{< /citations >}}

---

## Trying it
### One thing to run for each strategy

{{< notes >}}
Every row works on the example data in the repository, and every row works on
your own data by changing one path.

Start with the layout row. Everything after it needs a chunked, multi-resolution
copy to exist first, and the notebooks are all in `notebooks/`.
{{< /notes >}}

| | On the example data | On your own |
|---|---|---|
| **1 · Layout** | `tiff_to_ngff_and_neuroglancer.ipynb` - TIFF in, OME-Zarr pyramid out | point it at your stack, then check the result in the **ome-ngff-validator** |
| **1 · Layout**, point clouds | `large_pointclouds_potree_ept_launcher.ipynb` - LAS/LAZ in, octree out | any `.las`, `.laz` or `.ply` |
| **2 · Layout, used** | open the OME-Zarr from row 1 in **BigVolumeBrowser** | the same, and watch the blur sharpen as blocks arrive |
| **3 · Streaming** | `python server.py -d .`, then paste the URL into **Neuroglancer** | put it on dCache or S3 and send the link |
| **4 · Cheaper** | `luxar_gaussian_splats.ipynb` - volume in, 5 MB scene out | any volume with a background you can threshold to zero |

---

## Choosing

{{< notes >}}
The short version of the whole session.

Start from the data type and the size. The conversion is the work; the viewer
is a half-day either way. If what you want is a link a collaborator can open,
decide that first - it rules out most of the desktop tools before you start.
{{< /notes >}}

| You have | Convert to | Open it with |
|---|---|---|
| A big volume, working locally | N5, HDF5 or OME-Zarr | **BigVolumeBrowser**, **BigDataViewer**, **napari** |
| A big volume, to share as a link | OME-Zarr or precomputed | **Neuroglancer**, **vizarr**, **MoBIE** |
| A volume plus segmentations | precomputed | **Neuroglancer**, **webKnossos** |
| A big point cloud | COPC, or EPT / Potree | **Potree**, **CloudCompare** |
| A big surface mesh | glTF + meshopt, or 3D Tiles | **`<model-viewer>`**, **Nexus**, **Blender** |
| An adaptive simulation mesh | it already is one | **ParaView**, from t8code's `.pvtu` |
| A volume that only needs looking at | Gaussian splats | **luxar** |

---

## Where to go next

{{< horizontal >}}
{{< tutorial-link link="voxels.md" >}}
{{< tutorial-link link="point-clouds.md" >}}
{{< /horizontal >}}

{{< horizontal >}}
{{< tutorial-link link="meshes.md" >}}
{{< tutorial-link link="overview.md" >}}
{{< /horizontal >}}
