---
title: Large 3D Data
date: 2026-09-25
draft: false
layout: workshop
type: page
author: Deborah Schmidt
author_position: Helmholtz Imaging | MDC Berlin
description: How to visualize scientific volumetric datasets that are very large.
cover: img/bvv-magic.png
---

## Motivation

{{< notes >}}
Large 3D datasets become difficult for different reasons. 
This tutorial introduces complementary strategies for how to approach this.
{{< /notes >}}

Start with the bottleneck: **what is too large?**

{{< horizontal >}}

{{< block >}}
**Too large for what**
- **Disk**
- **RAM**
- **Graphics memory (VRAM)**
- **The network**
{{< /block >}}

{{< block >}}
**Approaches**
- **Layout** - optimize how the data is stored
- **Streaming** - optimize access to the data
- **A cheaper representation** -  reduce the amount of data itself
{{< /block >}}

{{< /horizontal >}}

---

## Data Layout optimization
### Structuring Volumes

{{< notes >}}
Some image formats support storing volumes in slices, chunks, and different resolution levels.

- **One array**: The volume can only be read into memory at once.
- **Stack of slices**: The volume is split in one dimension, into single planes for each index in that dimension, many slices form an image stack.
- **Chunk grid**: The volume is split in one or multiple dimensions, chunk size per dimension can differ
- **Tile grid**: Grid of 2D chunks.
- **Resolution pyramid**: The volume is stored in its original resolution, and in downsized versions. 

**Try it:** Which combinations require reading only a small fraction of the volume, and which approach the cost of reading the entire dataset?
{{< /notes >}}

{{< scene name="chunk-fetch" height="430" hint="drag to turn" caption="" >}}


---

## Data Layout optimization
### Structuring Volumes

{{< horizontal >}}

{{< block >}}

**Support chunks & multiple resolutions**
- In one file:
  - HDF5
  - OME-TIFF
- In a multi-file structure:
  - OME-Zarr
  - N5
{{< /block >}}

{{< figure src="img/ome-zarr-tree.svg" style="max-height: 40vh; width: auto" caption="OME-Zarr file tree" >}}

{{< /horizontal >}}

{{< citations >}}
- [OME-NGFF spec](https://ngff.openmicroscopy.org/latest/) · [Moore et al. (2021), Nat Methods 18, 1496–1498](https://doi.org/10.1038/s41592-021-01326-w)
{{< /citations >}}

---

## Data Layout optimization
### From dense volumes to sparse 3D data

{{< notes >}}
A regular grid of chunks is a natural fit for a dense volume: every location contains a voxel. But many other 3D datasets do not fill space. Point clouds contain points, and surface meshes contain triangles on a surface. If we covered their entire bounding box with a fine regular grid, most cells would be empty.

This is where a spatial hierarchy becomes useful: subdivide space only where data are present or where more detail is needed. An octree is one common way to do this in 3D.
{{< /notes >}}

{{< horizontal >}}
{{< block >}}
**Dense volume**
- Data fill the grid
- Regular **chunks** work well
- Same structure at every location
{{< /block >}}

{{< block >}}
**Sparse geometry**
- Data occupy only part of space
- A fine grid would contain many **empty cells**
- Use **spatial subdivision** instead
{{< /block >}}
{{< /horizontal >}}

{{< figure src="img/dense-vs-sparse.svg" style="max-height: 34vh; width: auto" caption="" >}}

---

## Data Layout optimization
### Sparse geometry

#### Octree

{{< notes >}}
An octree recursively divides 3D space into eight smaller cells. We only subdivide cells where the data or the required level of detail justifies it.

The interactive example uses the Armadillo scan to make the idea visible: almost all of the bounding box is empty, while a thin region around the surface contains the actual data.
{{< /notes >}}

{{< horizontal >}}

{{< block >}}
{{< figure src="img/octree-depiction.svg" style="max-height: 24vh; width: auto" caption="One cell, subdivided into eight children, each subdivided again into eight grandchildren of its own." >}}

- Empty regions stay **coarse**
- Data-rich regions become **fine**
- Depth gives a natural **level of detail**

{{< /block >}}

{{< scene name="octree-build" height="440" caption="" >}}

{{< /horizontal >}}

{{< citations >}}
- Armadillo: [Stanford 3D Scanning Repository](http://graphics.stanford.edu/data/3Dscanrep/), courtesy of Helmut Kungl, non-commercial/educational use with credit · [preparation script](https://github.com/ida-mdc/workshop-visualization/blob/main/tools/make-armadillo-voxels.py)
{{< /citations >}}

---

## Data Layout optimization
### Spatial hierarchies make large geometry scalable

{{< notes >}}
Divide space or geometry into regions and access only the detail that is needed. The exact hierarchy differs between formats and applications.
{{< /notes >}}

{{< horizontal >}}

{{< block >}}
**Point clouds**
- Organize **points spatially**
- Load/refine only visible regions
- **COPC, EPT, Potree**

**Surface meshes**
- Organize **geometry in spatial patches**
- Stream appropriate levels of detail
- **3D Tiles, Nexus**
{{< /block >}}

{{< block >}}
**Adaptive simulation meshes**
- Hierarchy defines **computational cells**
- Refine only where needed
- **t8code**
{{< /block >}}

{{< /horizontal >}}

{{< citations >}}
- [COPC](https://copc.io) · [Entwine / EPT](https://entwine.io/) · [Potree](https://github.com/potree/potree)
- [3D Tiles](https://www.ogc.org/standard/3dtiles/) · [Nexus](https://vcg.isti.cnr.it/nexus/)
- [t8code](https://github.com/DLR-AMR/t8code)
{{< /citations >}}

---

## Visualization based on optimized layouts
### Example: BigVolumeViewer

- **GPU cache** of blocks
- Block = chunk at one resolution level

{{< notes >}}
BVV chooses a resolution independently for each block. Near the camera, fine data are useful; farther away, coarse data are sufficient because each block covers fewer pixels on screen.

When fine data have not arrived yet, BVV can display an already available coarser level and replace it when the finer block arrives.
{{< /notes >}}

{{< scene name="bvv-blocks" height="420" caption="" >}}


{{< citations >}}
- Pietzsch, Saalfeld, Preibisch & Tomancak (2015), [*BigDataViewer: visualization and processing for large image data sets*](https://doi.org/10.1038/nmeth.3392)
{{< /citations >}}

---

## Visualization based on optimized layouts
### Example: PoTree

{{< notes >}}
A large point cloud can hold billions of points, far more than a viewer should draw in a frame. A point budget caps how many it draws.
{{< /notes >}}

- **Point budget:** maximum points per frame
- Descend into whatever looks **biggest on screen**, until the budget is spent
- What gets drawn is a **cut through the tree** - deep near the camera, shallow far away

{{< scene name="point-lod" height="470" hint="drag to rotate" caption="" >}}

{{< citations >}}
- Canyon: [USGS 3DEP](https://www.usgs.gov/3d-elevation-program), public domain, via the [AWS Open Data](https://registry.opendata.aws/usgs-lidar/) Entwine mirror · [preparation](https://github.com/ida-mdc/workshop-visualization/blob/main/tools/make-canyon-points.py) and [octree build](https://github.com/ida-mdc/workshop-visualization/blob/main/tools/make-canyon-octree.py) · vertical relief exaggerated 3x · [Potree](https://github.com/potree/potree) · [Schütz (2016), TU Wien](https://www.cg.tuwien.ac.at/research/publications/2016/SCHUETZ-2016-POT/) 
{{< /citations >}}

---

## Streaming

**Goal:** share a large dataset without sending the whole dataset

- Convert once → chunked, multi-resolution data
- Host somewhere, share a URL
- Viewer fetches only what the current view needs

**Local vs. remote**

- **Localhost** → only you
- **Temporal server via HPC node IP** → stream from HPC to local visualization tool
- **Public host** → anyone with the URL
- Viewer receives a **data address**

---

## Streaming

### Examples of links including both the data and the viewer

{{< horizontal >}}

{{< figure src="img/the-human-brain.png" style="max-height: 34vh; width: auto" link="https://h01-dot-neuroglancer-demo.appspot.com/#!%7B%22dimensions%22:%7B%22x%22:%5B8e-9%2C%22m%22%5D%2C%22y%22:%5B8e-9%2C%22m%22%5D%2C%22z%22:%5B3.3e-8%2C%22m%22%5D%7D%2C%22position%22:%5B332552.65625%2C141535.84375%2C3487.12451171875%5D%2C%22crossSectionScale%22:5.776802800212544%2C%22projectionOrientation%22:%5B0.00491650216281414%2C0.035930924117565155%2C-0.03526147082448006%2C0.9987198710441589%5D%2C%22projectionScale%22:261570.24038807175%2C%22layers%22:%5B%7B%22type%22:%22image%22%2C%22source%22:%22precomputed://gs://h01-release/data/20210601/4nm_raw%22%2C%22tab%22:%22source%22%2C%22name%22:%224nm%20EM%22%7D%2C%7B%22type%22:%22segmentation%22%2C%22source%22:%5B%7B%22url%22:%22precomputed://gs://h01-release/data/20210601/c3%22%2C%22subsources%22:%7B%22default%22:true%2C%22bounds%22:true%2C%22properties%22:true%2C%22mesh%22:true%7D%2C%22enableDefaultSubsources%22:false%7D%2C%22precomputed://gs://lichtman-h01-49eee972005c8846803ef58fbd36e049/goog14r0s5c3_new_props/segment_properties%22%5D%2C%22panels%22:%5B%7B%22flex%22:1.55%2C%22tab%22:%22segments%22%7D%5D%2C%22segments%22:%5B%221100054524%22%2C%221115430292%22%2C%2212237931142%22%2C%221333290325%22%2C%221538274151%22%2C%221539076840%22%2C%221594648509%22%2C%221638188509%22%2C%221828951844%22%2C%221915887451%22%2C%221988993337%22%2C%2220070214646%22%2C%222090806103%22%2C%222134549398%22%2C%222178704414%22%2C%222294780853%22%2C%222339328448%22%2C%222499107339%22%2C%222499384877%22%2C%222557789796%22%2C%222673254402%22%2C%2227622860459%22%2C%2227651872764%22%2C%2227870683066%22%2C%222791142865%22%2C%2228000894735%22%2C%2228045909614%22%2C%2228378958224%22%2C%2228409678489%22%2C%2228452985548%22%2C%2228525770719%22%2C%2228643309290%22%2C%2228672203772%22%2C%2228802547903%22%2C%2228803598117%22%2C%2228918216929%22%2C%2229021270843%22%2C%2229182786959%22%2C%2229238417446%22%2C%2229298236361%22%2C%222935896346%22%2C%2229459096371%22%2C%2229618159554%22%2C%2229765396306%22%2C%2229925423252%22%2C%2229938695074%22%2C%2229969547791%22%2C%2230101233972%22%2C%223023633866%22%2C%2230376944711%22%2C%2230406000355%22%2C%223052908678%22%2C%2230668773752%22%2C%2230767987832%22%2C%2230871567933%22%2C%2230974109956%22%2C%2231031989065%22%2C%2231032951251%22%2C%2231061717348%22%2C%2231133932587%22%2C%2231149133165%22%2C%223125564306%22%2C%2231658722916%22%2C%2232444986357%22%2C%223430740099%22%2C%223504577656%22%2C%223518943222%22%2C%223573728110%22%2C%2236123853342%22%2C%2236153829678%22%2C%2236241229806%22%2C%2236284756264%22%2C%2236445761568%22%2C%2236590837294%22%2C%2236619747807%22%2C%2236620463168%22%2C%2236633005581%22%2C%223664545249%22%2C%2236662790455%22%2C%2236678107375%22%2C%2236763714196%22%2C%2236809473223%22%2C%2236822073774%22%2C%2236822262086%22%2C%2236852896228%22%2C%2237173591638%22%2C%2237218168369%22%2C%2237318668413%22%2C%2237319791473%22%2C%2237420743412%22%2C%2237421824682%22%2C%2237463700916%22%2C%2237536734693%22%2C%2237581252436%22%2C%2237594612366%22%2C%2237668755920%22%2C%2237770758892%22%2C%2237801070911%22%2C%2237930756265%22%2C%2237958718097%22%2C%2238018479939%22%2C%2238092682277%22%2C%2238106873604%22%2C%2238208029710%22%2C%2238222309348%22%2C%2238339219897%22%2C%2238368158152%22%2C%2238383402139%22%2C%223839697992%22%2C%2238413115427%22%2C%2238543488421%22%2C%2238573083867%22%2C%2238586823171%22%2C%2238602358951%22%2C%2238717924646%22%2C%2238863556782%22%2C%2238863862489%22%2C%223897678996%22%2C%2238994907574%22%2C%2239023934118%22%2C%2239038491013%22%2C%2239052800624%22%2C%2239081564265%22%2C%2239271712983%22%2C%2239271916939%22%2C%2239359991385%22%2C%223941569746%22%2C%2239505037109%22%2C%2239694250521%22%2C%2240043667040%22%2C%2240102203154%22%2C%2240247497000%22%2C%2240378483178%22%2C%2240407875435%22%2C%2240464862282%22%2C%2241354296446%22%2C%2241630488832%22%2C%224217863883%22%2C%224318903980%22%2C%2245701832369%22%2C%224580553370%22%2C%224698412002%22%2C%224784821941%22%2C%2248079386659%22%2C%224917456198%22%2C%224961186471%22%2C%225062824784%22%2C%225499847526%22%2C%2258866575372%22%2C%2259536235974%22%2C%225965326176%22%2C%226024781859%22%2C%22664433854%22%2C%22707068981%22%2C%22794630620%22%2C%22823395680%22%2C%22853035674%22%2C%22910562342%22%5D%2C%22segmentQuery%22:%22#interneuron%20#L2%20NSe%3E=800%20%3CNSi%22%2C%22colorSeed%22:4270253886%2C%22name%22:%22c3%20segmentation%22%7D%2C%7B%22type%22:%22segmentation%22%2C%22source%22:%22precomputed://gs://h01-release/data/20210601/layers%22%2C%22tab%22:%22source%22%2C%22selectedAlpha%22:0.3%2C%22objectAlpha%22:0.2%2C%22segments%22:%5B%221%22%2C%222%22%2C%223%22%2C%224%22%2C%225%22%2C%226%22%2C%227%22%5D%2C%22segmentQuery%22:%221%2C2%2C3%2C4%2C5%2C6%2C7%22%2C%22name%22:%22cortical%20layers%22%2C%22visible%22:false%7D%5D%2C%22showSlices%22:false%2C%22prefetch%22:false%2C%22selectedLayer%22:%7B%22row%22:1%2C%22flex%22:1.55%2C%22size%22:309%2C%22layer%22:%224nm%20EM%22%7D%2C%22layout%22:%7B%22type%22:%22xy-3d%22%2C%22orthographicProjection%22:true%7D%2C%22selection%22:%7B%22row%22:2%2C%22flex%22:0.45%2C%22size%22:309%2C%22visible%22:false%7D%7D" caption="**Neuroglancer** · 1.4 PB of human cortex<br><span style='display:block; text-align:center; font-size:76%; opacity:.75'>[H01](https://h01-release.storage.googleapis.com/landing) · Shapson-Coe *et al.* (2024), [Science 384](https://doi.org/10.1126/science.adk4858)</span>" >}}

{{< figure src="img/tile-potree-lion.png" style="max-height: 34vh; width: auto" link="https://potree.github.io/potree/examples/lion.html" caption="**Potree** · a laser-scanned stone lion<br><span style='display:block; text-align:center; font-size:76%; opacity:.75'>[Potree](https://github.com/potree/potree), from its own example set</span>" >}}

{{< figure src="img/tile-model-viewer.png" style="max-height: 34vh; width: auto" link="https://modelviewer.dev/" caption="**`<model-viewer>`** · one glTF on a page<br><span style='display:block; text-align:center; font-size:76%; opacity:.75'>Spacesuit: [Smithsonian Digitization Program Office](https://3d.si.edu/)</span>" >}}

{{< /horizontal >}}

---

## Streaming
### What a viewer needs from the server

{{< horizontal >}}
- Static host → **serves files**
- Browser → **renders data**
- **CORS** → permits cross-origin requests
- **Byte ranges** → permits partial file requests
{{< block >}}
- **`access-control-allow-origin`** (CORS) - a browser reads a file from another host only when the response carries it. Without it `curl` works and the viewer stays empty
- **`accept-ranges: bytes`** - lets a viewer ask for part of a file. Needed by COPC, zipped Zarr and Potree's `octree.bin`
- Check headers with `curl -I`:
```bash
curl -I https://your-host.org/my-dataset.ome.zarr/.zattrs
```
{{< /block >}}
{{< /horizontal >}}

---

## Streaming
### Where to put the data

- **dCache / InfiniteSpace** at DESY, through HIFIS - no size limit, can be public
- **S3** or **Google Cloud Storage** - set the bucket's CORS policy
- **[BioImage Archive](https://www.ebi.ac.uk/bioimage-archive/)** - for published data
- Your own machine - `python server.py -d <dir>`, port 8082, CORS open


{{< citations >}}
- [HIFIS dCache documentation](https://hifis.net/doc/cloud-services/Storage_DESY/) · [hifis-storage.desy.de](https://hifis-storage.desy.de/) · [`server.py`](https://github.com/ida-mdc/workshop-visualization/tree/main/example_data/server.py), from the Neuroglancer repository
{{< /citations >}}

---

## Compact scene representations
### Borrowing from Computer Vision

{{< horizontal >}}

{{< block style="flex: 0 0 34%" >}}
- Developed for **computer vision**
- Classical input: **photographs of a real scene**, and where each camera stood
- Goal: realistic looking reconstruction of the 3D environment 
{{< /block >}}

{{< figure src="img/gaussian-splat-garden.jpg" style="max-height: 42vh; width: auto" caption="A garden captured on a phone and fitted as Gaussian splats. Credit: [Óscar Mirás on Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Polycam_gaussian_splatting_exemplo.png), CC BY-SA 4.0" >}}

{{< /horizontal >}}

---

## Compact scene representations
### NeRFs

{{< notes >}}
NeRF (Neural Radiance Field) introduced a very different way to represent a 3D scene.
Instead of explicitly storing voxels, points or triangles, the scene is encoded
in the weights of a neural network. Give the network a position in space and a
viewing direction, and it predicts the density and view-dependent appearance
at that position.
Rendering is similar to volume rendering: cast a ray for each
pixel, sample positions along that ray, but instead of reading values from a voxel array,
evaluate the field there. Then, composite the samples into the final pixel.
{{< /notes >}}

**Implicit representation**

- Scene = **learned function**
- Query **any position in space** → density + appearance
- Sample repeatedly along a **camera ray**
- **Volume-render** the samples


**Think of it as:** volume rendering, but **query a trained function instead of reading a voxel**.

{{< citations >}}
- NeRF: [Mildenhall et al. (2020)](https://arxiv.org/abs/2003.08934), *Representing Scenes as Neural Radiance Fields for View Synthesis*, ECCV · [figure script](https://github.com/ida-mdc/workshop-visualization/blob/main/tools/make-representation-figures.py)
{{< /citations >}}

---

## Compact scene representations
### 3D Gaussian Splatting

{{< notes >}}
3D Gaussian Splatting takes a different approach.
Instead of hiding the scene inside a neural network, it stores an explicit set
of optimized 3D primitives: anisotropic Gaussian blobs.
To render a view, the Gaussians are projected onto the image plane, where they
become elliptical splats. Visible splats are ordered and alpha-blended to form
the image.
The important contrast with NeRF is the rendering loop. We no longer evaluate
a neural network repeatedly along every ray. The representation itself consists
of drawable primitives.

{{< /notes >}}

**Explicit representation**

- Scene = **3D Gaussian primitives**
- Project them onto the screen → **2D elliptical splats**
- Sort + alpha-blend
- **Render directly**


{{< citations >}}
- 3D Gaussian Splatting: [Kerbl et al. (2023)](https://arxiv.org/abs/2308.04079), *3D Gaussian Splatting for Real-Time Radiance Field Rendering*, SIGGRAPH · [figure script](https://github.com/ida-mdc/workshop-visualization/blob/main/tools/make-representation-figures.py)
{{< /citations >}}

---

## Compact scene representations
### Example of a Gaussian Splat fit

{{< scene name="splat-fit" height="480" hint="scroll to zoom" caption="" >}}

{{< notes >}}
The slider changes how many splats are used to represent the target. With more splats, the approximation can capture finer structure.

Fitting means adjusting the splats so their rendered result matches the target as closely as possible.
{{< /notes >}}

{{< citations >}}
- Target: A crop of a micro-CT scan of a sunflower head. Chitwood, Quigley & Frank, [*X-ray CT Botanical Images - Set 1*](https://doi.org/10.5281/zenodo.15684909), Zenodo (2025), CC BY 4.0
- Fitting and rendering: [luxar](https://github.com/royerlab/luxar) · [fitting script](https://github.com/ida-mdc/workshop-visualization/blob/main/tools/make-splat-fit-demo.py)
{{< /citations >}}

---

## Tools
### Voxels: Convert and validate

{{< horizontal >}}
{{< block >}}

{{< notes >}}
For large volumes, the practical target is a chunked, multi-resolution representation. 
{{< /notes >}}

- **Workshop notebook:** [tiff_to_ngff_and_neuroglancer.ipynb](https://github.com/ida-mdc/workshop-visualization/blob/main/notebooks/tiff_to_ngff_and_neuroglancer.ipynb) - TIFF → pyramid → validate → serve → Neuroglancer
- Vendor formats → [**bioformats2raw**](https://github.com/glencoesoftware/bioformats2raw)
- NumPy → [**ngff-zarr**](https://github.com/thewtex/ngff-zarr) / [**ome-zarr-py**](https://github.com/ome/ome-zarr-py)
- Fiji → [**MoBIE**](https://mobie.github.io)
- Multi-tile acquisitions → [**BigStitcher**](https://imagej.net/plugins/bigstitcher/define-new-dataset)
- Check the result → [**OME-NGFF validator**](https://ome.github.io/ome-ngff-validator/)

{{< /block >}}

{{< figure src="img/ngff-validator.png" style="max-height: 34vh; width: auto" caption="The OME-NGFF validator checks the OME-ZARR structure." >}}
{{< /horizontal >}}

---

## Tools
### Voxels: View and work with the same pyramid

{{< notes >}}
Once a volume is stored as a chunked, multi-resolution dataset, several tools can reuse it. 
{{< /notes >}}

{{< horizontal >}}

{{< block >}}

**Local / desktop**
- [**BigVolumeBrowser**](https://github.com/ekatrukha/BigVolumeBrowser) / [**MoBIE**](https://mobie.github.io) → GPU volume rendering
- [**napari**](https://napari.org) → general Python-based exploration
- [**3D Slicer**](https://www.slicer.org) → clinical and biomedical volumes, segmentation, registration

{{< /block >}}

{{< figure src="img/bvb-ant.png" style="max-height: 28vh; width: auto" caption="BigVolumeBrowser rendering a synchrotron scan of a trap-jaw ant." >}}

{{< /horizontal >}}

{{< citations >}}
- Ant: synchrotron micro-CT from [**Antscan**](https://www.antscan.info), a digital library of 3D invertebrate anatomy by Katzke, van de Kamp & Economo · Katzke *et al.* (2026), [*High-throughput phenomics of global ant biodiversity*](https://doi.org/10.1038/s41592-026-03005-0), Nat Methods 23, 663–672 · scans via [BIOMEDISA](https://biomedisa.info/antscan/) and [RADAR4KIT](https://radar.kit.edu/)
{{< /citations >}}

---

## Tools
### Voxels: View and work with the same pyramid

**Browser / sharing**
- [**Neuroglancer**](https://github.com/google/neuroglancer) → volumes + segmentations
- [**webKnossos**](https://webknossos.org) → collaborative annotation
- [**Viv**](https://github.com/hms-dbmi/viv) → multiplexed microscopy

**Work on the data**
- [**BigStitcher**](https://imagej.net/plugins/bigstitcher/) → stitching
- [**BigWarp**](https://imagej.net/plugins/bigwarp) → registration
- [**Paintera**](https://github.com/saalfeldlab/paintera) / [**Labkit**](https://imagej.net/plugins/labkit/) → segmentation proofreading
- [**Mastodon**](https://github.com/mastodon-sc/mastodon) / [**BigTrace**](https://github.com/ekatrukha/BigTrace) → tracking and tracing


---

## Tools
### Point clouds: Convert once, then stream the hierarchy

{{< notes >}}
A raw LAS or LAZ file is a large point list. For large-data visualization, convert it once into a spatial, multi-resolution representation.

Say that the commands are not on this slide on purpose. The point clouds
session has a "do it yourself" slide with the two containers, the COPC
one-liner and the launcher URL, all of it tested - so this is the map and that
is the walk-through.
{{< /notes >}}

- **Covered in the [point clouds session]({{< ref "point-clouds.md" >}})**, with the commands to run
- [**PDAL**](https://pdal.io/) → read and write about anything, and reproject it
- [**PotreeConverter**](https://github.com/potree/PotreeConverter) / [**Entwine**](https://entwine.io/) → build the hierarchy
- [**Potree**](https://github.com/potree/potree) → browser visualization
- [**CloudCompare**](https://www.cloudcompare.org/) → desktop exploration, cleaning, alignment
- [**COPC**](https://copc.io/) → the same octree in one LAZ file

---

## Tools
### Meshes: Reduce, compress, or stream

{{< notes >}}
Meshes do not need one universal conversion step. The useful operation depends on the bottleneck: reduce triangle count, reduce bytes, or split the mesh into spatial levels of detail for streaming. The dedicated mesh tutorial goes into these operations in more detail.
{{< /notes >}}

{{< horizontal >}}
{{< block >}}
**Prepare**
- Fewer triangles → decimation in [**MeshLab**](https://www.meshlab.net/), [**Blender**](https://www.blender.org), [**fast-simplification**](https://github.com/pyvista/fast-simplification)
- Fewer bytes → [**Draco**](https://github.com/google/draco) / [**meshopt**](https://github.com/zeux/meshoptimizer)
- Load by region + LOD → [**3D Tiles**](https://www.ogc.org/standard/3dtiles/) / [**Nexus**](https://vcg.isti.cnr.it/nexus/)
{{< /block >}}

{{< block >}}
**View**
- [**Nexus**](https://vcg.isti.cnr.it/nexus/) → large multi-resolution meshes
- [**Blender**](https://www.blender.org) → desktop inspection + editing
- [**`<model-viewer>`**](https://modelviewer.dev) → glTF in the browser
{{< /block >}}
{{< /horizontal >}}

---

## Tools
### Voxels or points → Gaussian splats with [**luxar**](https://github.com/royerlab/luxar)

{{< notes >}}
Sometimes the goal is not to preserve the original representation for analysis, but to make a compact scene that is easy to move and view. luxar is the example used in this tutorial: it takes voxel volumes or point clouds and fits a Gaussian-splat representation.
{{< /notes >}}

- **Workshop notebook:** [luxar_gaussian_splats.ipynb](https://github.com/ida-mdc/workshop-visualization/blob/main/notebooks/luxar_gaussian_splats.ipynb) - install, compile, fit, serve

{{< figure src="img/luxar-sunflower.png" style="max-height: 30vh; width: auto" caption="The micro-CT volume and its fitted Gaussian-splat representation." >}}

{{< citations >}}
- Sunflower: Chitwood, Quigley & Frank, [*X-ray CT Botanical Images - Set 1*](https://doi.org/10.5281/zenodo.15684909), Zenodo (2025), CC BY 4.0
{{< /citations >}}

---

## Where to go next

Continue with the tutorial for the representation you want to inspect or create:

{{< horizontal >}}
{{< tutorial-link link="meshes.md" >}}
{{< tutorial-link link="point-clouds.md" >}}
{{< /horizontal >}}
