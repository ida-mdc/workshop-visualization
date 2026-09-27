---
title: "Volume rendering with BigDataViewer tools"
date: 2024-09-25
draft: true
layout: workshop
type: page
author: Deborah Schmidt
author_position: Helmholtz Imaging | MDC Berlin
description: Learn how to render voxel-based volumetric data using BigDataViewer (BDV) and tools built on top of BDV. 
cover: img/bvv-magic.png
---

## Introduction

{{< notes >}}
**BDV (BigDataViewer)** is a powerful tool for visualizing large-scale 3D image data, particularly for biological datasets such as volumetric microscopy images. BDV allows for interactive exploration of massive image datasets using a hierarchical storage approach, which enables real-time rendering of very large volumes without overwhelming system memory. BDV is part of a broader family of tools, including **BigVolumeViewer (BVV)** for large volumetric datasets and **SciView** for interactive 3D rendering in scientific contexts.

These tools are commonly used for large datasets that are too large to load fully into memory, providing efficient access and rendering through multi-resolution pyramids.
{{< /notes >}}

### Key Features of BDV:
- **Multi-resolution rendering**: BDV supports multi-resolution pyramids, allowing fast, real-time exploration of large datasets.
- **Arbitrary slicing**: Enables users to zoom, rotate, and slice through datasets interactively and in any angle.
- **Multiple data sources with individual transformations**: Enables visualization of datasets consisting of multiple 
  acquisitions.
- Comes preinstalled with [**Fiji**](https://fiji.sc/).

{{< citations >}}
- [BDV Documentation](https://imagej.net/plugins/bdv/)
- [Pietzsch, T., Saalfeld, S., Preibisch, S., & Tomancak, P. (2015). BigDataViewer: visualization and processing for 
  large image data sets. Nature Methods, 12(6), 481–483. doi:10.1038/nmeth.3392](https://www.nature.com/articles/nmeth.3392)
{{</ citations >}}

---

## BDV compatible formats

{{< notes >}}
BDV is compatible with several file formats, especially those designed for large-scale imaging. These formats typically include **multi-resolution pyramids** for efficient storage and visualization.
{{< /notes >}}

### Supported Data Formats:
- **ZARR/HDF5/N5**: These formats allow for hierarchical storage of large datasets, enabling faster access to the data and efficient memory usage.
- **Any dataset Fiji compatible dataset**: While these images might not support multi resolution rendering, they can 
  still be imported into BDV to leverage arbitrary slicing.

{{<figure src="https://imagej.net/media/plugins/bdv/bdv-bdv-start.png" style="max-height: 30vh; width: auto">}}

---

## Apps based on BDV
### The ecosystem, as of 2026

{{< notes >}}
BDV is not one program, it is a viewer core that a lot of tools are built on.
Knowing the list saves you writing something that already exists.

The common thread is the data model: a resolution pyramid plus a cache, so
everything here opens datasets larger than RAM, and all of it reads the same
N5, HDF5 and OME-Zarr files. Pick by what you need to *do*, not by the format.
{{< /notes >}}

| Viewing | For |
|---|---|
| **BigDataViewer** | arbitrary re-slicing of terabyte volumes; the base everything else sits on |
| **BigVolumeViewer** (BVV) | GPU volume rendering of the same multi-resolution data |
| **BigVolumeBrowser** (BVB) | volumes, meshes and point clouds together, in 3D |
| **MoBIE** | sharing and exploring multi-modal projects, including remote ones |
| **BDV Playground** | wiring BDV sources together from a GUI or a script |

---

## Apps based on BDV
### The ecosystem: doing something with it

{{< notes >}}
The other half: the tools that change the data rather than show it. All of
them inherit the same pyramid-plus-cache model, so all of them work on data
larger than RAM.

If you are about to write a script that loads a big volume and does something
interactive to it, check this list first.
{{< /notes >}}

| Working on the data | For |
|---|---|
| **BigStitcher** | stitching and registering multi-tile, multi-view acquisitions |
| **BigWarp** | landmark-based registration and warping between two datasets |
| **Paintera** | painting and proofreading large 3D segmentations |
| **Labkit** | quick interactive segmentation on big data |
| **Mastodon** / **MaMuT** | cell tracking through large time-lapses |
| **BigTrace** | tracing curvilinear structures - vessels, neurites, filaments |
| **ABBA** | aligning brain sections to a reference atlas |

{{< citations >}}
- [BigDataViewer on imagej.net](https://imagej.net/plugins/bdv/) · [The BigDataViewer ecosystem](https://analyticalscience.wiley.com/content/article-do/bigdataviewer-ecosystem-my-favorite-image-analysis-tool-neubias-members) · [BDV Playground](https://imagej.net/plugins/bdv/playground/bdv-playground)
{{< /citations >}}

---

## Apps based on BDV
### BigVolumeViewer (BVV)

{{< notes >}}
**BigVolumeViewer (BVV)** is the 3D equivalent to BDV. It provides GPU accelerated volumetric rendering of large 
scale datasets. 
{{< /notes >}}

- **GPU volume rendering** of data that does not fit in GPU memory
- **Multi-resolution**: it reads the pyramid BDV already built, and picks a level per view
- **Two modes**: maximum intensity projection and volumetric (alpha compositing) - toggle with `O`

{{< citations >}}
- [BigVolumeViewer image.sc thread](https://forum.image.sc/t/bigvolumeviewer-tech-demo/12104) · [Using BigVolumeViewer, MoBIE docs](https://mobie.github.io/tutorials/bigvolumeviewer.html)
{{</ citations >}}

---

## Apps based on BDV
### How BVV renders more than fits

{{< notes >}}
Worth understanding, because the three settings you are given map directly onto
the three parts of it.

BVV keeps a **GPU cache**: one large 3D texture cut into small uniform blocks -
32 voxels on a side - each holding one block of the volume at one level of the
resolution pyramid. Every block is padded by one voxel, so that trilinear
interpolation at a block's edge cannot bleed in data from its neighbour.

To draw a view, BVV first picks a **base resolution level**, chosen so that
screen resolution is matched for the nearest visible voxel. Then it builds a
small **lookup texture**: for every block of the volume, where in the cache
texture that block's data currently sits. The ray marcher reads the lookup,
then the cache.

Blocks that have not arrived yet fall back to a coarser level that has. That
is why a BVV view arrives blurry and sharpens, rather than blocking until it
is ready.

Now the settings. **GPU cache size** is how many blocks fit - drag it down here
and watch blocks drop out. **Cache tile size** is the block size. **Render
width and height** is the resolution the rays are cast at, which is why it
costs so much. And the camera position decides the base level, which is why
zooming in triggers loading.

Drag the camera glyph round rather than your own view, so you can orbit and
see where the detail went.
{{< /notes >}}

{{< scene name="bvv-blocks" height="420" caption="One large 3D texture, cut into blocks. Near the camera, fine levels; further out, coarser; past the cache budget, not loaded at all." >}}

---

## Apps based on BDV
### BigVolumeBrowser (BVB)

{{< notes >}}
The newest of these and the most useful one for this workshop, because it is
the only tool in the ecosystem that puts volumes, meshes *and* point clouds in
the same 3D scene. Developed by Eugene Katrukha at Utrecht, built on a fork of
BigVolumeViewer.

That combination is exactly what a lot of real projects need: a light-sheet
volume, the meshes from its segmentation, and a set of single-molecule
localisations, all in one view and all clippable.

Like BVV it does lazy loading from a resolution pyramid, so it opens datasets
larger than GPU memory. Set the GPU memory it may use on first launch - the
dialog opens by itself, and `F10` brings it back.
{{< /notes >}}

- **Volumes, meshes and point clouds together** - including SMLM localisations
- **Multiple volumes** at once, each with its own rendering settings
- **Clip and transform** any object freely in 3D; time-lapse supported
- **Reads OME-Zarr and N5**, locally or remotely, with lazy loading
- **Larger than GPU memory** - multi-scale pyramids, loaded on demand

{{< citations >}}
- [BigVolumeBrowser on imagej.net](https://imagej.net/plugins/bigvolumebrowser) · [Wiki and tutorials](https://github.com/UU-cellbiology/bigvolumebrowser/wiki) · [Announcement thread](https://forum.image.sc/t/bigvolumebrowser-a-new-3d-multi-volume-mesh-point-cloud-smlm-data-viewer/117764)
{{< /citations >}}

---

## Apps based on BDV
### BigVolumeBrowser: try it

{{< notes >}}
Fifteen minutes, and it is the fastest route to a publishable 3D render of big
data in this whole workshop.

A note on step 4: BVB asks how much GPU memory it may use, and the honest
answer is less than your card has. Leave headroom - the operating system and
your browser want some too. If rendering stutters, this is the first number to
turn down.
{{< /notes >}}

1. **Install** - *Help → Update → Manage Update Sites*, tick **BigVolumeBrowser**, *Apply and Close*, restart Fiji
2. **Launch** - *Plugins → BigVolumeBrowser X.X.X*, or type it in the search bar
3. **The window** - 3D canvas on the left, control panel on the right; `Ctrl+P` hides the panel, `P` brings it back
4. **Set the GPU memory** - the rendering parameters dialog opens on first launch; `F10` reopens it
5. **Add a volume** - the *Add volumes* card in the control panel; OME-Zarr or N5, local or a URL
6. **Add shapes** - the *Add shapes* card, for meshes and point clouds
7. **Work with it** - objects appear in the *All objects* tree; select one to clip, transform or restyle it

{{< citations >}}
- [Installation](https://github.com/UU-cellbiology/bigvolumebrowser/wiki/How-to-install-plugin) · [Getting started](https://github.com/UU-cellbiology/bigvolumebrowser/wiki/Getting-started) - there is a 12-minute video tutorial and a one-hour walkthrough
{{< /citations >}}

---

## Apps based on BDV
### MultiModal Big Image Data Sharing and Exploration (MoBIE)

Key Features of MoBIE:
- Special focus on **multimodal image datasets**
- Can **stream remote data**
- Support of **interactive tabular data exploration** alongside images
- Integrated **registration features**

{{< citations >}}
- [MoBIE website](https://mobie.github.io/)
- [Pape, C., Meechan, K., Moreva, E. et al. MoBIE: a Fiji plugin for sharing and exploration of multi-modal 
  cloud-hosted big image data. Nat Methods 20, 475–476 (2023). https://doi.org/10.1038/s41592-023-01776-4](https://doi.org/10.1038/s41592-023-01776-4)
{{</ citations >}}

---

## Apps based on BDV
### Demonstration: Fiji & MoBIE

{{< horizontal >}}

{{<figure src="img/head-3dviewer.png" caption="3DViewer">}}
{{<figure src="img/head-bdv.png" caption="BigDataViewer">}}
{{<figure src="img/head-mobie.png" caption="Mobie (BigVolumeViever)">}}

{{< /horizontal >}}

{{<citations>}}
- [Pape, C., Meechan, K., Moreva, E. et al. MoBIE: a Fiji plugin for sharing and exploration of multi-modal cloud-hosted big image data. Nat Methods 20, 475–476 (2023).](https://doi.org/10.1038/s41592-023-01776-4)
{{</citations>}}

---

## Apps based on BDV
### Demonstration: Fiji & MoBIE

1. Follow installation instructions [here](https://github.com/ida-mdc/workshop-visualization/tree/main/visualization_software)
2. Open Fiji
3. Open 3D Image (drag & drop) - i.e. `t1-head` from the [example data](https://github.com/ida-mdc/workshop-visualization/tree/main/notebooks/example_data) 
4. Plugins > MoBIE > Create > Create new MoBIE project..
5. dataset > Add > Enter name of dataset
6. source > Add > current displayed image
7. Open in MoBIE

---

## Apps based on BDV
### Demonstration: Fiji & MoBIE

Enable BigVolumeViewer:

{{<figure src="img/MoBIE-BVV.png" style="max-height: 29vh; width: auto" caption="Mobie (BigVolumeViever)">}}

More information here: https://imagej.net/plugins/mobie.

---

## Alternative Conversion Strategies
### BDV Plugin in Fiji

{{< notes >}}
Fiji allows users to convert standard 3D image stacks (e.g., TIFF) into **BDV-compatible formats** such as HDF5 or N5. 
{{< /notes >}}

### Conversion Steps:
- **Step 1**: Open your 3D image stack (e.g., TIFF) in Fiji.
- **Step 2**: Go to **Plugins > BigDataViewer > Export Current Image as BDV**.
- **Step 3**: Choose the output format (HDF5 or N5) and select any additional options (e.g., multi-resolution pyramid).

---

## Alternative Conversion Strategies
### BigStitcher Plugin

{{< notes >}}
The **BigStitcher** plugin in Fiji is another tool that integrates with BDV, primarily for **stitching large 
microscopy datasets** from multiple tiles. It includes an excellent plugin for generating XML BDV HDF5 or H5 
datasets from various other image formats, for example 
{{< /notes >}}

### Conversion Steps:
- **Step 1**: Follow the [installation instructions](https://imagej.net/plugins/bigstitcher/#download).
- **Step 2**: Open **Plugins › BigStitcher › BigStitcher** 
- **Step 3**: Click the **Define a new dataset** button on the left side of the dialog
- **Step 4**: Follow steps depending on your dataset type (more documentation linked below)

{{< citations >}}
- [BigStitcher](https://imagej.net/plugins/bigstitcher/)
- [BigStitcher > Define New Dataset](https://imagej.net/plugins/bigstitcher/define-new-dataset)
- [Hörl, D., Rojas Rusak, F., Preusser, F. et al. BigStitcher: reconstructing high-resolution image datasets of 
  cleared and expanded samples. Nat Methods 16, 870–874 (2019). https://doi.org/10.1038/s41592-019-0501-0](https://doi.org/10.1038/s41592-019-0501-0)
{{</ citations >}}

---

## SciView

{{< notes >}}
**SciView** is a modern 3D visualization tool designed for scientific data rendering. It integrates with Fiji and ImageJ and supports advanced 3D rendering features, including volumetric and surface rendering.
{{< /notes >}}

### Key Features of SciView:
- **Interactive 3D rendering**: Explore volumetric data interactively using SciView’s intuitive interface.
- **Supports advanced lighting and shading**: Create realistic 3D scenes with SciView’s lighting and shading options.


{{< citations >}}
- [SciView documentation](https://docs.scenery.graphics/sciview)
- [Ulrik Günther, Tobias Pietzsch, Aryaman Gupta, Kyle I.S. Harrington, Pavel Tomancak, Stefan Gumhold, and Ivo F. 
  Sbalzarini: scenery — Flexible Virtual Reality Visualisation on the Java VM. IEEE VIS 2019 (accepted, arXiv:1906.
  06726).](https://arxiv.org/abs/1906.06726)
{{</ citations >}}

---

## Paintera

{{< notes >}}
Paintera is a general visualization tool for 3D volumetric data and proof-reading in segmentation/reconstruction with a primary focus on neuron reconstruction from electron micrographs in connectomics.
{{< /notes >}}

{{<horizontal>}}

{{<block>}}

### Key Features of Paintera:
- Views of **orthogonal 2D cross-sections**
- **Painting in 3D**
- **Mesh visualization** and on-the-fly generation

{{</block>}}

{{<figure src="https://github.com/saalfeldlab/paintera/raw/6226b9cbdeaeaa22a5f4c5088c3d2cc83646b143/img/social-preview-1280.png">}}

{{</horizontal>}}

{{< citations >}}
- [Paintera on GitHub (Saalfeld Lab, Janelia Research Campus)](https://github.com/saalfeldlab/paintera)
{{</ citations >}}

