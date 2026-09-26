---
title: "Meshes"
date: 2025-09-17
draft: false
type: page
layout: workshop
author: Deborah Schmidt
author_position: Head of Helmholtz Imaging Support Unit, MDC Berlin
cover: img/bg.jpg
---

## Mesh data
### Vertices, edges, faces

{{< notes >}}
Build it up: vertices, then the edges between them, then the faces they close.
That is the whole data structure.

Now the trap, and it is worth doing slowly. Set the resolution to coarse with
flat shading - obviously a low-poly object. Switch to smooth shading and it
looks fine. It is not fine: the triangle count has not changed, the silhouette
still gives it away, and any area or curvature you measure is measured on the
coarse geometry. Smooth shading is a lighting trick, not more data.
{{< /notes >}}

{{< scene name="mesh-anatomy" height="420" caption="Smooth shading changes the lighting, not the geometry. Watch the silhouette and the triangle count." >}}

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
{{< notes >}}
The **Marching Cubes algorithm** is one of the most popular methods for extracting a 3D surface from volumetric data. It identifies the points in a voxel grid where the dataset crosses a specific threshold value (the **isosurface**) and uses those points to generate a mesh.

{{< /notes >}}

{{< figure src="img/MarchingCubesEdit.svg" height="700px" caption="Marching cubes algorithm. Credit: [Ryoshoru, Jmtrivial on Wikimedia](https://commons.wikimedia.org/wiki/File:MarchingCubesEdit.svg), CC BY-SA 4.0">}}

---

## Converting voxel datasets into meshes
### The two knobs, live

{{< notes >}}
A snowflake rather than the usual blob, because its branches span a wide range
of sizes - so you can watch the fine ones disappear while the trunk is still
fine. That is what resolution means, much better than a sphere going blocky.

Drag the **threshold**. The crystal grows and dissolves, and nothing in the
data marks the right value. Whatever surface you publish, that number belongs
in your methods section.

Drag the **grid resolution**. The specimen does not change - only the sampling.
So the staircase, the triangle count and the smoothness are all statements
about your grid, not about the crystal. Which also means: never measure area or
curvature on a surface without saying what grid it came off.

One honest note. This demo uses *surface nets*, a dual method - one vertex per
straddling cell rather than marching cubes' lookup table. The surfaces are near
enough identical and both knobs behave the same way; surface nets is here
because it fits on one screen without a 256-entry table.
{{< /notes >}}

{{< scene name="iso-extraction" height="430" caption="Threshold and grid resolution, on a synthetic snowflake volume. Neither knob changes the specimen." >}}

---

## Converting voxel datasets into meshes
### Conversion scripts
{{< notes >}}
While several tools include converting volumetric datasets into meshes, VTK has worked particularly well in our 
experience. Check out the tutorial below for more details. This includes Python code snippets, but also the 
possibility to run conversion through a graphical user interface or command line using an Album solution.
{{< /notes >}}

1. Install and activate environment ([guide](https://github.com/ida-mdc/workshop-visualization/tree/main/visualization_software))
2. Download Notebook [voxel_rendering_napari.ipynb](https://github.com/ida-mdc/workshop-visualization/tree/main/notebooks/voxel_rendering_napari.ipynb) into workshop directory 
3. Type `jupyter lab` and press `Enter`
4. Open Notebook from list of files on the left side
5. Run Cells in the Notebooks one by one by pressing `Shift` and `Enter`


---

## Mesh processing
### Reducing mesh complexity
{{< notes >}}
Large, complex meshes can be computationally intensive to render. Reducing mesh complexity helps with performance, especially for web viewers or real-time visualization. We’ll explore some standard techniques to simplify meshes while maintaining critical details.
{{< /notes >}}

{{< horizontal >}}

- **Decimation**: A process to reduce the number of polygons in a mesh while maintaining the overall shape and detail.
- **Remeshing**: Tools like MeshLab and Blender offer remeshing techniques that can optimize mesh topology for better performance.
- **LOD (Level of Detail)**: Use LOD techniques to switch between different levels of mesh complexity based on the viewer’s distance.

{{< figure src="img/reducing-mesh-complexity.jpg" >}}

{{< /horizontal >}}

---

## Mesh processing
### Decimation, and what it costs

{{< notes >}}
Real decimation, live. This is vertex clustering: lay a grid over the mesh,
weld every vertex in a cell to that cell's average, drop the triangles that
collapse to nothing. It is the crudest useful method - MeshLab's quadric edge
collapse keeps shape far better at the same triangle budget - and that is
exactly why it is worth watching. Its failure mode is every method's failure
mode, only sooner.

Turn the wireframe on and drag the cluster size. Watch the order in which
things die: the small plates at the branch tips first, then the thin side
branches, then the arms thicken and merge. Fine features go first, always,
because they are the ones that fit inside one cell.

The practical rule that follows: decimate for rendering, never for
measurement. Keep the original, and report the reduction if the picture is
load-bearing.
{{< /notes >}}

{{< scene name="mesh-simplify" height="430" caption="Vertex-cluster decimation. Fine features go first - they are the ones that fit inside a single cell." >}}

---

## Rendering meshes
### Rendering meshes with Blender
{{< notes >}}
Blender is a powerful open-source tool for rendering meshes. It supports realistic rendering, including lighting, shadows, transparency, and advanced surface textures. In this tutorial, you will learn how to set up Blender to render scientific datasets as meshes.
{{< /notes >}}

{{< tutorial-link link="mesh-rendering-blender" >}}

---

## Large meshes
### Where the size comes from

{{< notes >}}
Marching cubes places a triangle wherever the threshold crosses, so the count
follows surface area rather than volume: a few million for a simple closed
surface, far more for a branched one.

Decimation usually buys an order of magnitude. The features that disappear
first are the fine ones, which may be the ones the figure was about.
{{< /notes >}}

- An isosurface of a 1024³ volume is **millions of triangles** - tens of millions if the surface is convoluted
- Decimation is usually worth **an order of magnitude** before anything shows

---

## Large meshes
### When decimation is not enough

{{< notes >}}
Compression and level of detail solve different problems, and are often
confused.

Draco and meshopt make the file smaller. 3D Tiles, Nexus and Neuroglancer's
multi-resolution meshes reduce how much is drawn.
{{< /notes >}}

{{< horizontal >}}

{{< block >}}
**Smaller file**
- **Draco**, **meshopt** for glTF
- Meshopt decodes much faster
- You still load all of it
{{< /block >}}

{{< block >}}
**Less drawn**
- **3D Tiles** - tiled, geospatial
- **Nexus** - multi-resolution, streamed
- **Neuroglancer multi-res meshes** - a mesh per segment, cut into octree fragments
{{< /block >}}

{{< /horizontal >}}

- **One mesh for anyone to look at**: glTF plus [`<model-viewer>`](https://modelviewer.dev), and you are done in an afternoon

{{< citations >}}
- [glTF](https://www.khronos.org/gltf/) · [meshoptimizer](https://github.com/zeux/meshoptimizer) · [3D Tiles](https://www.ogc.org/standard/3dtiles/) · [Nexus](https://vcg.isti.cnr.it/nexus/) · [Neuroglancer multi-resolution mesh format](https://github.com/google/neuroglancer/blob/master/src/datasource/precomputed/meshes.md)
{{< /citations >}}

---
