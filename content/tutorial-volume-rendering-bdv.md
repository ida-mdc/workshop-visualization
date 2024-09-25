---
title: "Volume rendering with BigDataViewer tools"
date: 2024-09-09
draft: false
layout: workshop
author: Deborah Schmidt
author_position: Helmholtz Imaging | MDC Berlin
description: Learn how to render voxel-based volumetric data using BigDataViewer (BDV) and tools built on top of BDV. 
cover: https://imagej.net/media/plugins/bdv/bdv-bdv-start.png
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
- **HDF5/N5**: These formats allow for hierarchical storage of large datasets, enabling faster access to the data and efficient memory usage.
- **Any dataset Fiji compatible dataset**: While these images might not support multi resolution rendering, they can 
  still be imported into BDV to leverage arbitrary slicing.

{{<figure src="https://imagej.net/media/plugins/bdv/bdv-bdv-start.png">}}

---

## Data conversion
### BDV Plugin in Fiji

{{< notes >}}
Fiji allows users to convert standard 3D image stacks (e.g., TIFF) into **BDV-compatible formats** such as HDF5 or N5. 
{{< /notes >}}

### Conversion Steps:
- **Step 1**: Open your 3D image stack (e.g., TIFF) in Fiji.
- **Step 2**: Go to **Plugins > BigDataViewer > Export Current Image as BDV**.
- **Step 3**: Choose the output format (HDF5 or N5) and select any additional options (e.g., multi-resolution pyramid).

---

## Data conversion
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

## BigVolumeViewer (BVV)
### Key Features

{{< notes >}}
**BigVolumeViewer (BVV)** is the 3D equivalent to BDV. It provides GPU accelerated volumetric rendering of large 
scale datasets. 
{{< /notes >}}

- **GPU-accelerated rendering**: BVV uses GPU processing to speed up the rendering of extremely large volumetric datasets.
- **Multi-scale volume rendering**: Allows for efficient exploration of datasets by loading data at different scales.
- available through Fiji **BigVolumeViewer** update site

{{< citations >}}
- [BigVolumeViewer image.sc thread](https://forum.image.sc/t/bigvolumeviewer-tech-demo/12104)
{{</ citations >}}

---

## BigVolumeViewer (BVV)
### BigVolumeViewer - playground
- fork of BVV with additional features such as better volumetric rendering, gamma correction, lookup tables and more

{{<horizontal>}}

{{<figure src="https://camo.githubusercontent.com/185a2487f35dec3ff46296ed3856c13ca6d75ba8cf89377e1fde0bf1d5363840/68747470733a2f2f6b6174707978612e696e666f2f736f6674776172652f6276765f706c617967726f756e642f62767650475f6d6178696d756d5f696e74656e736974795f72656e6465722e706e67">}}
{{<figure src="https://camo.githubusercontent.com/6fa348e6e161df0f583955b364516002d408c98a090e1301c9559925fcc458c8/68747470733a2f2f6b6174707978612e696e666f2f736f6674776172652f6276765f706c617967726f756e642f62767650475f766f6c756d65747269635f72656e6465722e706e67">}}

{{</horizontal>}}

{{< citations >}}
- [BigVolumeViewer-playground](https://github.com/UU-cellbiology/bvv-playground)
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

## MultiModal Big Image Data Sharing and Exploration (MoBIE)

### Key Features of MoBIE:
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

