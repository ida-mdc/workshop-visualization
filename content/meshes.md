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

{{< citations >}}
- Lorensen & Cline (1987), [*Marching cubes: A high resolution 3D surface construction algorithm*](https://doi.org/10.1145/37402.37422), SIGGRAPH
{{< /citations >}}

---

## Converting voxel datasets into meshes
### Other ways to place the surface

{{< notes >}}
Marching cubes reads the eight corners of a cell, looks the sign pattern up in
a table of 256 cases, and puts a vertex on every cell edge the threshold
crosses. Everything in this family works that way.

Dual methods put one vertex per cell instead, at the average of that cell's
crossings, and join the four cells around each crossing edge into a quad.

A dual method gives you a smoother surface, not a smaller one. A surface has
about as many crossing cells as crossing edges, so the vertex counts land
within a percent of each other - on one ER sheet in our own pipeline, 0.16%
apart. Surface nets took about 66% longer for that.
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

- Dual methods are **smoother and have no step size** - one vertex per cell is the only resolution they offer
- They also **couple the axes**, which shows up on anisotropic data

{{< citations >}}
- [Flying edges](https://doi.org/10.1109/LDAV.2015.7348069): Schroeder, Maynard & Geveci (2015), LDAV · [Surface nets](https://doi.org/10.1007/BFb0056277): Gibson (1998), *Constrained elastic surface nets*, MICCAI · [Dual contouring](https://doi.org/10.1145/566654.566586): Ju, Losasso, Schaefer & Warren (2002), SIGGRAPH · [figure script](https://github.com/ida-mdc/workshop-visualization/blob/main/tools/make-surface-extraction.py)
{{< /citations >}}

---

## Converting voxel datasets into meshes
### What you run it on matters more than which one

{{< notes >}}
The staircase people blame marching cubes for comes from the input. Run it
straight on a binary mask and every crossing sits at a voxel face, so the
surface is a staircase whichever method placed the vertices.

Switch between the three and watch the volume readout rather than the surface.
Blurring does not only smooth the mask, it moves it: a Gaussian pulls a thin
branch under the threshold before it does much to the trunk, so fine structures
erode while the core is untouched. Here it costs 39%; on the ant in the
notebook, sigma 2.5 costs three quarters of the volume.

The coverage map is the one to spend time on, because it is what a classifier
hands you and people throw it away. Each voxel says what fraction of it is
inside, which is sub-voxel information a mask never had - so the surface comes
out smooth with nothing applied to it, and it does not shrink.

If someone asks about signed distance fields, the answer is that on a mask
they do nothing. Marching cubes only interpolates along grid edges, and a
crossing edge always runs from one voxel in to one voxel out, so the field
reads plus-one and minus-one and the vertex lands at the midpoint - the same
vertex the binary mask gave. Smoothing the field first does change it, and
makes it worse, for the same reason blurring the mask does.

The point to land: smooth and accurate are different things. Get the sub-voxel
information from upstream, not from a filter.
{{< /notes >}}

- **Binary mask in** → a lattice, whichever method you picked - every boundary voxel rounded in or out
- **Blurred mask in** → smooth, and **much smaller** - thin structures erode first
- **Coverage or probability map in** → smooth *and* the right size, with **nothing applied**
- A **signed distance field** built from a mask changes nothing - the crossing still lands mid-edge
- Anisotropic voxels: give any distance or blur step the **voxel size**, or the surface is wrong along the coarse axis

{{< scene name="iso-input" height="430" caption="The same specimen and the same grid, extracted from three different fields. Watch the enclosed volume, not the surface." >}}

---

## Converting voxel datasets into meshes
### The one-voxel border

{{< notes >}}
Extraction puts a surface where the threshold is crossed. Where the specimen
runs off the edge of the volume nothing crosses, so the surface stops and the
mesh has a hole in it.

Drag the field of view in. The specimen does not change - only how much of it
was scanned - and the open-edge count goes from zero to a few hundred. Then
turn padding on and it goes back to zero.

That number is the demo. "Looks closed" is not a check; an edge belonging to
one triangle instead of two is. An open mesh has no inside, so its volume is
undefined, boolean operations fail, and slicing it in Blender means looking
through the hole.

Say the second half out loud, because it is the part people take away wrong:
padding closes the surface, it does not recover the specimen. The cap is flat
and it sits where your field of view ended. If you needed the rest of the
animal, the answer is a bigger scan.
{{< /notes >}}

- A specimen touching the edge of the volume extracts as an **open surface**
- **One voxel of background on every face** is the whole fix - `np.pad(mask, 1)`
- Check it with a number: **edges belonging to one triangle** instead of two
- Padding **closes** the surface. It does not **recover** the specimen

{{< scene name="iso-padding" height="430" caption="The field of view, not the specimen, decides whether the mesh is closed." >}}

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

This demo runs surface nets, the dual method from two slides back. Both knobs
behave the same way under marching cubes.
{{< /notes >}}

{{< scene name="iso-extraction" height="430" caption="Threshold and grid resolution, on a synthetic snowflake volume. Neither knob changes the specimen." >}}

---

## Converting voxel datasets into meshes
### The whole conversion, in nine steps

{{< notes >}}
The notebook runs on a leafcutter ant from Antscan, and it is built so that
every claim it makes is a number it prints rather than a picture you squint
at.

Four of the nine steps are the ones that are missing when a mesh comes out
wrong, and we have just done three of them on the slides: pad, blur, decimate.
The fourth is the voxel size, which is why meshes turn up in Blender at a
two-hundredth of life size.

Point at step 8 if you point at anything. Quadric decimation hits any triangle
budget you ask for and tears the legs doing it; the topology-preserving one
stays closed and then refuses to go further. You get the budget or the
watertight mesh, not both.
{{< /notes >}}

{{< horizontal >}}

{{< block >}}
1. **Load** the volume - *and its voxel size*
2. **Threshold** - no value is the right one
3. **Clean** - drop small components, not all but the largest
4. **Pad** with one voxel of background
5. **Blur** the mask into a field
6. **Extract** - `contour(method="flying_edges")`
7. **Smooth** - Taubin, not Laplacian
8. **Decimate** - and count open edges after
9. **Export** - STL, PLY or glTF
{{< /block >}}

{{< block >}}
**Running it**

```bash
uv venv .venv --python 3.11
uv pip install --python .venv \
  -r tools/requirements_mesh.txt
uv run --python .venv jupyter lab
```

[voxel_to_mesh.ipynb](https://github.com/ida-mdc/workshop-visualization/blob/main/notebooks/voxel_to_mesh.ipynb)

{{< qr-code identifier="nb-voxel-to-mesh-meshes" link="https://github.com/ida-mdc/workshop-visualization/blob/main/notebooks/voxel_to_mesh.ipynb">}}
{{< /block >}}

{{< /horizontal >}}

{{< citations >}}
- Ant: [Antscan](https://biomedisa.info/antscan/specimen/1031) specimen 1031, *Acromyrmex balzani*, CC BY 4.0 · Katzke *et al.* (2026), [*High-throughput phenomics of global ant biodiversity*](https://doi.org/10.1038/s41592-026-03005-0), Nat Methods 23, 663–672
{{< /citations >}}

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


{{< scene name="mesh-simplify" height="430" caption="Vertex-cluster decimation. Fine features go first - they are the ones that fit inside a single cell." >}}

{{< /horizontal >}}

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
### Three ways to make it cheaper

{{< notes >}}
A mesh already holds its geometry explicitly, so there is more than one thing
to cut. Decimation removes triangles. Compression removes bytes and gives the
same triangle count back when it decodes. Multi-resolution streaming leaves
the mesh alone and loads less of it for a given view.

They stack: decimate, then compress, then split into levels of detail.

The scene runs real quadric edge collapse on the Armadillo scan. Watch what
goes first - the fine shell texture - and what survives to the very end, which
is the pose and the silhouette.
{{< /notes >}}

- **Decimation** → fewer triangles
- **Compression** → fewer bytes, same triangles back
- **Multi-resolution streaming** → fewer triangles loaded for this view
- They **combine**

{{< scene name="mesh-decimate" height="420" hint="drag to rotate" caption="Quadric edge collapse on a laser scan of the Stanford Armadillo. Fine shell texture goes first; the pose survives to the end." >}}

{{< citations >}}
- Armadillo: [Stanford 3D Scanning Repository](http://graphics.stanford.edu/data/3Dscanrep/), courtesy of Helmut Kungl, non-commercial/educational use with credit · [preparation script](https://github.com/ida-mdc/workshop-visualization/blob/main/tools/make-armadillo-mesh.py)
- Quadric error metrics: [Garland & Heckbert (1997)](https://doi.org/10.1145/258734.258849), SIGGRAPH

{{< /citations >}}

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
