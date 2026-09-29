---
title: "Meshes"
date: 2026-09-29
draft: false
type: page
layout: workshop
author: Deborah Schmidt
author_position: Head of Helmholtz Imaging Support Unit, MDC Berlin
cover: img/bg.jpg
---

## Converting voxel datasets into meshes

{{< notes >}}
For scientific visualization, meshes are often extracted from volumetric datasets and then analyzed or rendered.
Annotations can be used to add specific information to volumetric datasets, such as marking points of interest (e.g., cell locations, regions of interest) or segmenting areas of the data. Converting these annotated datasets into meshes allows for the visual representation of those specific features.

When converting volumetric data to **meshes**, it's necessary to draw concrete borders between the **foreground** (the object of interest) and the **background**. This is achieved through:
{{< /notes >}}

- **Fixed thresholds**: Used to generate meshes by separating foreground from background using a set intensity threshold.
- **Content-based annotations**: Create precise meshes by using annotated regions to define boundaries.
- **Machine learning & interactive labeling**: Interactive tools combine user input with AI predictions to refine boundaries.

{{< figure src="img/annotation-conversion.jpg" width="800">}}

{{< citations >}}
- [© Müller et al. https://doi.org/10.1083/jcb.202010039](https://rupress.org/jcb/article/220/2/e202010039/211599/3D-FIB-SEM-reconstruction-of-microtubule-organelle) 
{{</ citations >}}

---

## Converting voxel datasets into meshes
### Marching Cubes


{{< horizontal >}}

- One **cube of eight voxels** at a time - each corner above or below the threshold
- 8 corners → **256 patterns**, looked up in a fixed table of which triangles to draw
- A vertex lands **where the threshold was actually crossed** along an edge

{{< figure src="img/marching-cubes-cases.svg" style="max-height: 46vh; width: auto" class="center" caption="The 2D case (marching squares)">}}

{{< /horizontal >}}

{{< citations >}}
- Lorensen & Cline (1987), [*Marching cubes: A high resolution 3D surface construction algorithm*](https://doi.org/10.1145/37402.37422), SIGGRAPH · [figure script](https://github.com/ida-mdc/workshop-visualization/blob/main/tools/make-marching-cubes-figure.py)
{{< /citations >}}

---

## Converting voxel datasets into meshes
### The rules, applied

{{< scene name="marching-squares-sweep" height="520" caption="" >}}

---

## Converting voxel datasets into meshes
### Other ways to place the surface

{{< notes >}}
Marching cubes reads the eight corners of a cell, looks the sign pattern up in
a table of 256 cases, and puts a vertex on every cell edge the threshold
crosses. Everything in this family works that way.

Dual methods put one vertex per cell instead, at the average of that cell's
crossings, and join the four cells around each crossing edge into a quad.
{{< /notes >}}

{{< horizontal >}}

{{< block >}}
- **Marching cubes** - a vertex on every crossing edge, from a 256-case lookup table
- **Flying edges** - the same surface, in four passes over the grid; parallel, and what VTK runs today
- **Surface nets** - one vertex per cell, at the average of that cell's crossings
- **Dual contouring** - surface nets plus the gradients at the crossings, so sharp edges survive
{{< /block >}}

{{< figure src="img/surface-extraction.svg" style="max-height: 30vh; width: auto" caption="The same field and the same grid. Left, a vertex on each crossing edge; right, one vertex per crossing cell." >}}

{{< /horizontal >}}

{{< citations >}}
- [Flying edges](https://doi.org/10.1109/LDAV.2015.7348069): Schroeder, Maynard & Geveci (2015), LDAV · [Surface nets](https://doi.org/10.1007/BFb0056277): Gibson (1998), *Constrained elastic surface nets*, MICCAI · [Dual contouring](https://doi.org/10.1145/566654.566586): Ju, Losasso, Schaefer & Warren (2002), SIGGRAPH · [figure script](https://github.com/ida-mdc/workshop-visualization/blob/main/tools/make-surface-extraction.py)
{{< /citations >}}

---

## Converting voxel datasets into meshes
### Make it smoother

{{< horizontal >}}

- **Binary mask in** → a lattice, whichever method you picked - every boundary voxel rounded in or out
- **Blurred mask in** → smooth, details get lost
- **Probability map in** → smooth *and* the right size
- Anisotropic voxels: give any distance or blur step the **voxel size**, or the surface is wrong along the coarse axis

{{< scene name="iso-input" height="520" caption="" >}}

{{< /horizontal >}}

---

## Converting voxel datasets into meshes
### The one-voxel border

{{< horizontal >}}

- An object touching the edge of the volume extracts as an **open surface**
- **One voxel of background on every face** closes it - `np.pad(mask, 1)`.

{{< scene name="iso-padding" height="520" caption="" >}}

{{< /horizontal >}}

---

## Converting voxel datasets into meshes
### The whole conversion

1. **Load** the volume - *and its voxel size*
2. **Threshold**
4. **Pad** with one voxel of background
5. **Blur** the mask into a field
6. **Extract** - `contour(method="flying_edges")`
7. **Smooth**
8. **Decimate**
9. **Export** - STL, PLY or glTF

[voxel_to_mesh.ipynb](https://github.com/ida-mdc/workshop-visualization/blob/main/notebooks/voxel_to_mesh.ipynb)

{{< citations >}}
- Ant: [Antscan](https://biomedisa.info/antscan/specimen/1031) specimen 1031, *Acromyrmex balzani*, CC BY 4.0 · Katzke *et al.* (2026), [*High-throughput phenomics of global ant biodiversity*](https://doi.org/10.1038/s41592-026-03005-0), Nat Methods 23, 663–672
{{< /citations >}}

---

## Large meshes
### Three ways to make it cheaper

{{< horizontal >}}

- **Decimation** → fewer triangles
- **Compression** → fewer bytes, same triangles back
- **Multi-resolution streaming** → fewer triangles loaded for this view
- They **combine**

{{< scene name="mesh-decimate" height="420" hint="drag to rotate" caption="Quadric edge collapse on a laser scan of the Stanford Armadillo." >}}

{{< /horizontal >}}

{{< citations >}}
- Armadillo: [Stanford 3D Scanning Repository](http://graphics.stanford.edu/data/3Dscanrep/), courtesy of Helmut Kungl, non-commercial/educational use with credit · [preparation script](https://github.com/ida-mdc/workshop-visualization/blob/main/tools/make-armadillo-mesh.py)
- Quadric error metrics: [Garland & Heckbert (1997)](https://doi.org/10.1145/258734.258849), SIGGRAPH

{{< /citations >}}

---

## Rendering meshes
### From a script

- off-screen rendering with PyVista
[mesh_rendering_tutorial.ipynb](https://github.com/ida-mdc/workshop-visualization/blob/main/notebooks/mesh_rendering_tutorial.ipynb)


---

## Rendering meshes
### Rendering meshes with Blender
{{< notes >}}
Blender is a powerful open-source tool for rendering meshes. It supports realistic rendering, including lighting, shadows, transparency, and advanced surface textures. In this tutorial, you will learn how to set up Blender to render scientific datasets as meshes.
{{< /notes >}}

{{< tutorial-link link="mesh-rendering-blender" >}}
