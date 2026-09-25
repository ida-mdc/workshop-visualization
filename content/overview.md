---
title: "3D Dataset Visualization Overview"
date: 2026-09-22
draft: false
type: page
layout: workshop
author: Deborah Schmidt
author_position: Head of Helmholtz Imaging Support Unit, MDC Berlin
description: This session summarizes why and how we visualize scientific datasets in 3D.
cover: img/bg.jpg
---

{{< unlisted >}}

## What do you see?

{{< scene name="depth-instinct" height="620" hint="off" fill="true" >}}

{{< guesses title="What LLMs said" side="left" >}}
ChatGPT: a tree
Claude: a mushroom, or an umbrella
Gemini: a mushroom cloud, an explosion
{{< /guesses >}}

{{< guesses title="What people said" side="right" >}}
Thomas: a flower or palm
Inga: a flower
Artür: a flower
Maria: a flower
Martin: flowers
Dante: a flower
Matthias & Rob: a flower
{{< /guesses >}}

{{< reveal-note >}}
**3D is our natural habitat.** Reading shape, depth and occlusion from a moving
view is something we all do continuously and without effort. 
Let's take advantage of this by rendering volumetric scientific datasets in 3D, so we can read them best.
{{< /reveal-note >}}

---

## Motivation
### Purpose of visualization

{{< notes >}}
3D datasets (datasets with a width, height, and depth dimension) can be visualized for different reasons: 
{{< /notes >}}

- **To understand** - comprehend a dataset in all spatial dimensions at once.
- **To learn** - visualize specific features to draw conclusions from.
- **To share and tell** - discuss your work (and your data) with and beyond scientific circles.

---

## Motivation
### From 2D to 3D: Adding depth

{{< notes >}}
It can be much simpler and very helpful to explore 3D datasets in a dimensionality reduced way, for example by inspecting slices or maximum projections. But we would deprive ourselves of the depth dimension, which we are very trained to read well. 
{{< /notes >}}

{{< notes >}}
#### How do we achieve depth? 
{{< /notes >}}

{{< horizontal >}}

{{< scene name="flat-projection" height="260" hint="off" caption="Volume slice" >}}

{{< arrow label="what adds depth" >}}
- **Occlusion**
- **Shading and shadows**
- **Perspective**
- **Motion parallax**
- **Stereo / VR**
{{< /arrow >}}

{{< scene name="depth-cues" height="260" hint="off" caption="3D Visualization" >}}

{{< /horizontal >}}

{{< notes >}}
Of course, a 3D rendering is still a 2D image. The display has two dimensions, and
the third one is only implied - by motion, by perspective, by shadows. 
{{< /notes >}}


---

## 3D Datasets - Data Types
### Which axes does your data have?


- **X, Y, Z** - the three spatial axes. This is the part that makes it 3D. Also called **width, height, and depth**.
- **C** - channels: stains, wavelengths, labels.
- **T** - time: the same volume recorded at different time points.
- **3D** in this workshop refers to the three spatial axes.

---

## 3D Datasets - Data Types

{{< notes >}}
Let's start by discussing the most common data types which can be represented in 3D.
{{< /notes >}}

### Voxels

{{< notes >}}
A value at every point of a regular grid, so the position of a voxel is its
index and the file is just an array plus the size of one voxel.

**Isotropic** means the same spacing along all
three axes, **anisotropic** means it is not, which is the normal case in
microscopy. The voxel size is included in the file header / the metadata, and if it is wrong or missing, 
everything based on the dataset depending on space (like 3D visualizations) will be inaccurate.
{{< /notes >}}

{{< horizontal >}}

{{< block >}}
- **Grid-based data structure**: Voxels are values at every position in a discrete block
- This enables us to look inside any structure in the grid
- Watch for **resolution**, and whether it is **isotropic** or **anisotropic**

- **Formats** TIFF / OME-TIFF, OME-Zarr, HDF5 / N5, NIfTI, NRRD, DICOM, MRC,
  vendor formats (CZI, LIF, ND2, IMS, LSM), NetCDF, ...
{{< /block >}}

{{< scene name="voxel-grid" height="300" hint="off" >}}

{{< /horizontal >}}

---

## 3D Datasets - Data Types

### Meshes

{{< notes >}}
Meshes are usually not measured by scientific imaging modalities, but derived from voxels or point clouds for improved visualizations.
{{< /notes >}}

{{< horizontal >}}

{{< block >}}
- Points in space joined into triangles, describing a **surface**
- Quality metrics:
  - **watertight**: no holes, so the surface encloses a volume
  - **manifold**: every edge is shared by exactly two triangles
  - **normals** facing outward
  
- **Formats** STL, PLY, OBJ, glTF / GLB, VTK / VTP
{{< /block >}}

{{< scene name="mesh-anatomy" height="300" hint="off" >}}

{{< /horizontal >}}

---

## 3D Datasets - Data Types

### Point Clouds

{{< horizontal >}}

{{< block >}}
- Carries **positions plus attributes**; no connectivity
- **Drawn as primitives**: a **dot** , **square, or a **splat** (a soft
  oriented disc that blends with its neighbours into a surface)
- The **density** of the points will determine how well one can estimate a surface

- **Formats** LAS / LAZ, COPC, E57, PLY, plain XYZ / CSV
{{< /block >}}

{{< scene name="point-cloud" height="300" hint="off" >}}

{{< /horizontal >}}

---

## 3D Datasets - Data Types

### Vector Fields

{{< horizontal >}}

{{< block >}}
- Carries a **direction and a magnitude** per location
- Can be stored like voxels as a multi-channel volume
- The magnitude can for example represent flow, displacement, or diffusion
- **Glyphs** show directions for individual points; **streamlines** show where the field leads

- **Formats** VTK / VTI / VTU, NetCDF, multi-component NIfTI, OME-Zarr or HDF5
  with a component axis
{{< /block >}}

{{< scene name="vector-field" height="300" hint="off" >}}

{{< /horizontal >}}

---

## 3D Datasets - Sources in Science
### Microscopy

{{< notes >}}
In microscopy, 3D datasets are assembled one Z slice at a time. A **stack of slices** is the volume.

Slices can either be taken with light through the full sample, or the sample has to be cut off slice by slice. 
This often leads to worse resolution in Z.
Datasets in microscopy often also contain multiple channels and can size up to terabytes per image.
{{< /notes >}}

- **Examples**: confocal, light-sheet, electron microscopy, histology

{{< scene name="acq-microscopy" height="320" >}}

---

## 3D Datasets - Sources in Science
### Tomography

{{< notes >}}
In tomography, the object is recorded from different angles. 
Each angle leads to a projection, and the volume is reconstructed from all projections together.
Tomography datasets are usually isotropic (same resolution in all dimensions), and usually also very large.
{{< /notes >}}

- **Examples**: clinical CT, micro-CT, synchrotron tomography, electron tomography, MRI

{{< scene name="acq-tomography" height="320" >}}

---

## 3D Datasets - Sources in Science
### Photogrammetry

{{< notes >}}
In photogrammetry, the object is recorded with ordinary photographs taken from
many positions. Software then works out where each photograph was taken from,
and triangulates every surface point from the images that can see it.

A point only exists if several photographs see it, so overlap is what decides
whether the reconstruction works. It also only ever sees surfaces - there is no
interior - and it needs texture to match. 
{{< /notes >}}

- **Examples**: drone survey, handheld and phone capture, multi-camera rigs

{{< scene name="acq-photogrammetry" height="320" >}}

---

## 3D Datasets - Sources in Science
### Range scanning

{{< notes >}}
In range scanning, a pulse is sent in a known direction and the time it takes
to come back gives a distance. The scanner sweeps through a grid of directions,
so what it records is one distance per direction - a range image, not a
picture.

Because distance is measured, the result arrives in real units. 

Depending on the specific modalities, different signals are kept, from first pulse only to full waveforms (also see next section).
This affects if areas directly hidden from the pulse are recoverable from the signals or not.
{{< /notes >}}

- **Examples**: terrestrial laser scanning, airborne LiDAR, structured light, time-of-flight cameras

{{< scene name="acq-rangescan" height="320" >}}

---

## 3D Datasets - Sources in Science
### Echo and wave methods

{{< notes >}}
Echo methods send a pulse and time the return, exactly like a laser scanner.
The whole returning waveform is kept and reflections contribute to the reconstructed volume.
This makes it possible to retrieve information from areas in the shadow of the pulse.

Reconstruction is called migration here, but it is tomographic
back projection under another name, and it fails the same way when there are
too few shots.

Imaging radar - SAR - belongs to this family too, but works a bit differently: the antenna moves, and the
long synthetic aperture that gives it its resolution is built up along that
path and not from a fixed array of shots.
{{< /notes >}}

- **Examples**: seismic reflection, sub-bottom profiling, sonar, ground-penetrating radar, ultrasound, imaging radar (SAR)

{{< scene name="acq-echo" height="320" >}}

---

## 3D Datasets - Sources in Science
### Simulation

{{< notes >}}
In simulations, models are used to describe volumetric shapes, signals or processes.
The model can be used to sample values in space and time, and in different resolutions within the same dataset. 

Two consequences when you come to visualize it. Adaptive and unstructured grids
will not open in a viewer that expects a plain array. 
{{< /notes >}}

- **Examples**: CFD, molecular dynamics, finite elements, climate models

{{< scene name="acq-simulation" height="320" >}}

---

## Rendering Pipeline
### How do we get from 3D data to a picture on a screen?

{{< notes >}}
1. **Application** - you assemble the scene: geometry, camera, lights, materials
2. **Geometry** - place every vertex in the world, project it onto the image plane
3. **Rasterization** - which pixels does each primitive cover?
4. **Pixel processing** - what color is each of those pixels: lighting, texture, depth, blending
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
  M@{ img: "{{< u "icons/pipeline/mesh.svg" >}}", label: "Mesh", pos: "b", w: 68, h: 68 }
  P@{ img: "{{< u "icons/pipeline/points.svg" >}}", label: "Point cloud", pos: "b", w: 68, h: 68 }
  F@{ img: "{{< u "icons/pipeline/vectors.svg" >}}", label: "Vector field", pos: "b", w: 68, h: 68 }
  G@{ img: "{{< u "icons/pipeline/glyphs.svg" >}}", label: "Glyphs, streamlines", pos: "b", w: 68, h: 68 }
  T@{ img: "{{< u "icons/pipeline/primitives.svg" >}}", label: "Primitives", pos: "b", w: 68, h: 68 }
  R@{ img: "{{< u "icons/pipeline/rasterize.svg" >}}", label: "Rasterize", pos: "b", w: 68, h: 68 }
  S@{ img: "{{< u "icons/pipeline/shade.svg" >}}", label: "Shade", pos: "b", w: 68, h: 68 }
  V@{ img: "{{< u "icons/pipeline/voxels.svg" >}}", label: "Voxels", pos: "b", w: 68, h: 68 }
  RM@{ img: "{{< u "icons/pipeline/raymarch.svg" >}}", label: "March a ray", pos: "b", w: 68, h: 68 }
  PX@{ img: "{{< u "icons/pipeline/pixels.svg" >}}", label: "Pixels", pos: "b", w: 68, h: 68 }
  M --> T
  P --> T
  F --> G
  G --> T
  T --> R
  R --> S
  S --> PX
  V --> RM
  RM --> PX
  V -. "isosurface" .-> T
```
{{< /center >}}
{{< /horizontal >}}

{{< citations >}}
- [The graphics pipeline, on learnopengl.com](https://learnopengl.com/Getting-started/Hello-Triangle)
- Akenine-Möller, Haines & Hoffman, *Real-Time Rendering* - chapter 2, the four-stage model used above
{{< /citations >}}

---

## Rendering Pipeline
### Terms which are helpful to know

The rendering pipeline is in one way or the other implemented in all 3D visualization tools. Only selected parts are exposed to the user.
For example, opening a volume in napari runs the same pipeline; the software has just chosen the camera, the lights
and the materials for you. In Blender, in contrast, you can adjust pretty much all aspects along the rendering pipeline.

Some terms come up repeatedly in the context of 3D rendering:

- **Shader** - a small program that runs on the GPU, once per vertex or once
  per pixel.
- **Rasterization** - for each triangle, which pixels does it cover? The step that maps freely positioned 3D objects onto a raster.
- **Ray casting** - for each pixel, send a ray into the scene and read what it
  passes through. Volume rendering is this.
- **Ray tracing** - ray casting plus secondary rays, which is where reflections
  and shadows come from.

---

## How to pick a visualization approach
### Questions to ask

{{< notes >}}
How to pick the right approach and the best tools for 3D Visualization? Here are a few questions that can guide you through this decision: 
{{< /notes >}}

1. **Explorative or reproducible** - clicking, or scripting
2. **How accessible** - what does your reader have to download and install
3. **Fast or pretty** - realtime vs. fancy, expensive rendering

{{< notes >}}
People start at the beginning: here is my data, what can I do with it. That
leads to wandering, because there are always more things you can do than things
you need.

Start at the end instead. Name the picture you need, then ask what has to be
true for that picture to exist, and keep stepping backwards until you arrive at
the data you already have.
{{< /notes >}}

{{< horizontal >}}

```mermaid
---
config:
  flowchart:
    wrappingWidth: 280
---
flowchart RL
  A@{ img: "{{< u "icons/questions/artifact.svg" >}}", label: "The artifact", pos: "b", w: 80, h: 80 }
  B@{ img: "{{< u "icons/questions/visible.svg" >}}", label: "What should be shown", pos: "b", w: 80, h: 80 }
  E@{ img: "{{< u "icons/questions/memory.svg" >}}", label: "Fits in memory?", pos: "b", w: 80, h: 80 }
  F@{ img: "{{< u "icons/questions/tool.svg" >}}", label: "Which tool", pos: "b", w: 80, h: 80 }
  G@{ img: "{{< u "icons/questions/data.svg" >}}", label: "The data you have", pos: "b", w: 80, h: 80 }
  A --> B
  B --> E
  E --> F
  F --> G
```

{{< /horizontal >}}

---

## How to pick a visualization approach

### Step 1 - what exactly is the artifact?

{{< notes >}}
Be concrete and physical. Not "a visualisation" - a 180 mm wide figure at 300
dpi. A 20 second clip of multiple channels blending into each other. A URL a collaborator can open.

Then say what the reader has to be able to see: "that the vessel passes *through* the
tumour", "that these two cells are *separate*", "that the flow *reverses* here".
{{< /notes >}}

{{< horizontal >}}
```mermaid
flowchart LR
  Q["What is your goal?"] --> F["A figure"]
  Q --> V["A video"]
  Q --> L["A link"]
  Q --> S["A deeper understanding of the data"]
  F --> F2["Fixed size, scripted, orthographic"]
  V --> V2["Animation support"]
  L --> L2["Streamable data format, hosting solution"]
  S --> S2["Fast and systematic"]
```
{{< /horizontal >}}

---

## How to pick a visualization approach
### Step 2 - what has to be visible, and what carries it?

{{< horizontal >}}
```mermaid
---
config:
  flowchart:
    wrappingWidth: 760
---
flowchart LR
  Q["What must the reader see?"] --> A["Shape, from outside"]
  Q --> B["Something inside something else"]
  Q --> C["Where two things meet"]
  Q --> D["Swarm behavior"]
  Q --> E["Direction or change"]
  A --> A2["Mesh rendering or surface rendering for volumes"]
  B --> B2["Volume rendering with transfer functions or clipping plane"]
  C --> C2["Voxel slices plus one 3D overview"]
  D --> D2["Point cloud - dots or splats, colored by attribute"]
  E --> E2["Vector field - glyphs, streamlines or animation"]
```
{{< /horizontal >}}

---

## How to pick a visualization approach
### Step 3 - does it fit in memory?

{{< horizontal >}}

{{< block >}}
- **Fits comfortably** - load it and work
- **Fits, but barely** - downsample to explore, run the real thing headless
- **Does not fit** - change the data layout:
    - **Chunking / tiling**: splitting the dataset up into sections (TIFF, ZARR, HDF5, load via Dask)
    - **Resolution pyramids**: storing multiple resolutions of different sizes (OME-ZARR)
    - **Load data on demand** (Neuroglancer, BigDataViewer, BigVolumeViewer, ...)
{{< /block >}}

{{< scene name="bvv-blocks" height="520" caption="" >}}

{{< /horizontal >}}

---

## How to pick a visualization approach
### Step 4 - choosing a tool - desktop

{{< notes >}}
Here are some of the tools we have used, and what each one is good at.
This is a subjective, incomplete list that will become stale fast with upcoming updates and new releases.
Please let us know if we should be aware of a great tool that is not on this list.
 
**We focus on Open Source software only** not because there aren't great commercial options available. 
But they are often targeting specific domains or proprietary devices and formats and are not accessible to everyone.
Since we support scientists across all domains, we focus on software that can be used, inspected and adapted openly.
{{< /notes >}}

{{< tools kind="desktop" >}}

---

## How to pick a visualization approach
### Step 4 - choosing a tool - libraries

{{< notes >}}
Many desktops program on the previous slide can also be scripted - napari,
ParaView and 3D Slicer from Python, Fiji from Groovy or Jython, MeshLab
through PyMeshLab, CloudCompare from the command line. 
But using a library can make it easier to include rendering into existing scripts and workflows. 
{{< /notes >}}

{{< tools kind="library" >}}

---

## How to pick a visualization approach
### Step 4 - choosing a tool - browser-based software

{{< notes >}}
Browser based 3D visualization is rapidly growing. Here are a few options.
<!-- TODO point at the browser rendering page here once content/browser-rendering.md is committed -->
{{< /notes >}}

{{< tools kind="browser">}}

---

## What this needs from your machine

- **The GPU matters more than the CPU.** Volume rendering is work per pixel and depends on GPU shaders. Integrated graphics handle small volumes and get slow quickly.
- **Graphics memory is the limitation.** A volume has to fit in VRAM to be
  rendered interactively. When it does not, data has to be downsampled, chunked,
  or streamed.
- **In the browser** you need WebGL2, which every current browser has. WebGPU
  is arriving and is considerably faster.
- You can run expensive rendering jobs headless (without a graphical user interface) on the cluster, for example with Blender.

---

## How to proceed


{{< horizontal >}}
{{< tutorial-link link="voxels.md" >}}
{{< tutorial-link link="meshes.md" >}}
{{< /horizontal >}}

{{< horizontal >}}
{{< tutorial-link link="point-clouds.md" >}}
{{< tutorial-link link="colors.md" >}}
{{< /horizontal >}}