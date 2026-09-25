---
title: "Volume Rendering of Voxel Based Data"
date: 2026-09-24
draft: false
layout: workshop
type: page
author: Deborah Schmidt
author_position: Helmholtz Imaging | MDC Berlin
description: "A brief overview of how to render voxel based image datasets. Cover image: iodine-stained micro-CT of Ceratophrys ornata, Kleinteich & Gorb 2015, CC0."
cover: img/frog2.png
---


## Voxels

{{< notes >}}
A pixel has two dimensions, a voxel has three - think of it as a little cube.
A 3D dataset is a block of them.

All three blocks below are depicting a Argentine horned frog, scanned by computed tomography (head, tongue - which has impressive adhesive
qualities, and a detail of the tongue).
{{< /notes >}}

- A **grid-based data structure**: a value at every position in a discrete block
- **Transparency** makes the shape - voxels outside a chosen intensity range are not drawn
- **Voxel size** can differ per axis, and belongs in the metadata

{{< scene name="voxel-cubes" height="400" hint="drag to turn all three" >}}

{{< citations >}}
- *Ceratophrys ornata*, iodine-stained micro-CT. [Kleinteich & Gorb](https://doi.org/10.5061/dryad.066mr), CC0
{{< /citations >}}

---

## Voxels
### When the spacing is wrong

{{< notes >}}
When a dataset is acquired in slices, the slice thickness often differs from
the pixel size within a slice. The result is anisotropic: the spacing between
samples is not the same along every axis.

That spacing lives in the metadata, not in the array. If it is not written
down, or not read, the viewer draws cubes and the specimen comes out the wrong
shape.
{{< /notes >}}

{{< scene name="voxel-spacing" height="400" hint="drag to turn all three" caption="Same data in the middle and on the right. Only the metadata differs." >}}

---

## Ray casting

Ray casting sends one ray from the camera through each pixel and records what
it meets.

{{< scene name="volume-raycasting" height="430" hint="drag to rotate" >}}

---


## Ray casting
### What the shader does with the samples

{{< notes >}}
One dataset, one ray per pixel, four renderings. The only thing that differs
between the panels is what the shader does with the samples a ray collected.

The plots underneath are those same four operations on a single ray.
{{< /notes >}}

{{< scene name="volume-modes" height="430" hint="drag to turn" >}}

- Each is a **shader**, a small program run per pixel on the GPU - and more modes exist than these four

---

## Transfer functions
### Value in, color and opacity out

{{< figure src="icons/transfer-function.svg" style="max-height: 36vh; width: auto" >}}


A **transfer function** turns a voxel's value into a color and an opacity. The
same lookup table is applied to every voxel in the volume. It includes:

- A **color ramp** spanning the range the data occupies
- An **opacity curve**, which decides what is visible and what is seen through

---

## Transfer functions
### Examples

{{< notes >}}
The same volume under four transfer functions. Nothing about the data changes
between them; only which values are opaque and what color they take.
{{< /notes >}}

{{< scene name="volume-transfer" height="400" hint="drag to turn" >}}

---

## Try it out
### napari

{{< notes >}}
napari renders volumes on the GPU and is the quickest way to get one on
screen.

Drag the frog on, press the 2D/3D button, and try the rendering modes in the
layer controls.
{{< /notes >}}

```bash
uvx --from "napari[all]" napari
```

{{< horizontal >}}

{{< block >}}
Drag [frog-head.tif](https://github.com/ida-mdc/workshop-visualization/raw/main/example_data/ceratophrys-ornata/frog-head-256x256x195.tif) onto the window, then press

{{< figure src="img/napari-3d-button.png" style="max-height: 7vh; width: auto" >}}

and pick a **rendering** mode in the layer controls
{{< /block >}}

{{< figure src="img/napari-rendering-modes.png" style="max-height: 42vh; width: auto" >}}

{{< /horizontal >}}

---

## Try it out
### Jupyter notebooks

{{< notes >}}
VTK exposes the transfer function directly, so it is the option when the
curve has to be built by hand.
{{< /notes >}}

```bash
uv venv .venv_volumetric --python 3.11
uv pip install --python .venv_volumetric -r tools/requirements_volumetric.txt
uv run --python .venv_volumetric jupyter lab
```

- [voxel_rendering_napari.ipynb](https://github.com/ida-mdc/workshop-visualization/tree/main/notebooks/voxel_rendering_napari.ipynb) - the same viewer, driven from Python
- [voxel_rendering_vtk.ipynb](https://github.com/ida-mdc/workshop-visualization/tree/main/notebooks/voxel_rendering_vtk.ipynb) - transfer functions by hand

---

## Challenges
### Separating foreground from background

{{< notes >}}
A threshold separates foreground from background when their intensities are clearly separable. In the frog three quarters of the voxels are exactly zero.

FIB-SEM is resin and stained membrane edge to edge, so every voxel is sample.
Its histogram has no counts at zero, and no threshold separates the individual elements.
{{< /notes >}}

{{< block >}}
- A threshold works when there **is** a background
- Some datasets have none - FIB-SEM is resin, stain and membrane, edge to edge
- **No transfer function fixes this** - it requires a preprocessing step
{{< /block >}}

{{< horizontal >}}

{{< figure src="img/fibsem-slice-histogram.png" >}}

{{< scene name="fibsem-block" height="400" hint="drag to rotate" >}}

{{< /horizontal >}}

{{< citations >}}
- FIB-SEM of a mouse pancreatic islet, `jrc_mus-pancreas-1`: [Xu, Pang, Bennett, Mueller, Solimena & Hess (2020)](https://doi.org/10.25378/janelia.13114499), CC BY 4.0, via [OpenOrganelle](https://openorganelle.janelia.org/datasets/jrc_mus-pancreas-1) · see also [Müller et al. (2021)](https://doi.org/10.1083/jcb.202010039)
{{< /citations >}}

---

## Challenges
### Denoising and segmentation, before rendering

{{< notes >}}
Denoising estimates the signal underneath a noisy acquisition. Segmentation
assigns each voxel to an object, so the volume carries labels.

Both run before the volume reaches a viewer. A label volume is drawn as
objects with a shape and a color, and the transfer function no longer has to
separate them.

The panels are one block as acquired, denoised and segmented. The nuclei on
the left are hard to pick out at all; after denoising they are round and
separate.
{{< /notes >}}

{{< scene name="volume-upstream" height="400" hint="drag to turn" >}}

- **[nnInteractive](https://github.com/MIC-DKFZ/nnInteractive)** for your own volumes: a point, a scribble or a box on one 2D slice gives a full 3D mask you can correct, in napari, MITK or 3D Slicer

{{< citations >}}
- Tribolium at low laser power, [CARE example data](https://doi.org/10.1038/s41592-018-0216-7), Weigert et al. · denoised with [UniFMIR](https://bioimage.io/#/?id=decisive-panda) (fine-tuned on this dataset, CC BY 4.0) · segmented with [Cellpose 3](https://doi.org/10.1038/s41592-025-02595-5)
{{< /citations >}}

---

## Challenges
### When it does not fit in memory

{{< notes >}}
Light-sheet and volume EM produce hundreds of gigabytes, well beyond graphics
memory.

The answer is a different data layout and viewers that load on demand.
{{< /notes >}}

{{< horizontal >}}
{{< tutorial-link link="large-data" >}}
{{< /horizontal >}}
