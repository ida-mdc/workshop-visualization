---
title: "3D Data Visualization Workshop"
date: 2025-09-17
draft: false
type: page
layout: workshop
author: Deborah Schmidt
author_position: Head of Helmholtz Imaging Support Unit, MDC Berlin
description: In this workshop, we highlight various approaches and methodologies for visualizing 3D datasets. 
cover: img/bg.jpg
---

## 3D Dataset types

{{< horizontal >}}

{{<figure src="img/3d-data-types-euklidian.png" width="800">}}

{{< block >}}

{{< notes >}}
- Understanding the type of data you are working with is crucial for effective 3D rendering. Below, we outline the 
common categories of datasets that are often visualized in three dimensions.
{{< /notes >}}

- **Voxel-Based Datasets** (Euclidean-structured)
{{< notes >}}
Voxel-based datasets represent data as a grid of values (voxels) in **Euclidean space**, where each voxel holds a specific value, such as intensity in medical imaging (e.g., CT, MRI scans) or simulation results. These datasets are inherently structured and can be visualized using volume rendering, isosurface extraction, or slice-based views.
{{< /notes >}}

- **Meshes** (Non-Euclidean-structured)
{{< notes >}}
Meshes are composed of **vertices, edges, and faces** that define the surface of a 3D object. Unlike voxels, which describe volumes, meshes describe surfaces and are commonly used in **computer graphics** and **CAD models**. Meshes can be visualized through techniques like surface rendering, wireframe views, and texture mapping. Properties like curvature or scalar fields can also be mapped onto the mesh for enhanced interpretation.
{{< /notes >}}

- **Point Clouds** (Non-Euclidean-structured)
{{< notes >}}
Point clouds are a collection of points in 3D space, where each point is defined by its **X, Y, Z coordinates**. They are often derived from **LiDAR** scans, 3D scanning, or particle simulations. Visualization of point clouds often involves **point-based rendering**, surface reconstruction, or filtering techniques to highlight areas of interest.
{{< /notes >}}

- **Vector Fields** (structured or unstructured)
{{< notes >}}
Vector fields assign a vector to every point in space, showing direction and magnitude of change at each point.
{{< /notes >}}

{{< /block >}}

{{< /horizontal >}}


---

## Voxel‑Based Images

{{< notes >}}
Volumetric datasets, such as medical imaging (CT/MRI scans) or fluid simulations, are complex datasets where each voxel represents a value in 3D space. 
{{< /notes >}}

- **What is it?** 3D grid (voxels) with scalar (or vector/tensor) values.  
- **Acquire (by domain):** CT/MRI, light‑sheet/confocal, micro‑CT, simulations.  
- **Used for:** Inspect interiors, segment/analyze regions, measure volumes.  
- **Stored as:** TIFF stacks, NIfTI/NRRD, HDF5, **OME‑Zarr** (great for big data & web).  
- **Visualized with:** Orthogonal slices, **volume ray casting**, MIP, isosurfaces.

{{<figure src="img/voxel-based-data.png" caption="Voxel based data representation. Credit: [Hasanov, S. et al. (2021), CC BY-SA 4.0](https://www.researchgate.net/publication/353527450_Hierarchical_homogenization_and_experimental_evaluation_of_functionally_graded_materials_manufactured_by_the_fused_filament_fabrication_process).">}}

---

## Voxel‑Based Images
### Voxel spacing, anisotropy

{{< notes >}}
Many volumes have different spacing in z than in x/y. If you ignore this, objects look squashed or stretched and measurements are wrong.
{{< /notes >}}

- **Spacing** = physical size per voxel (e.g., 0.2 × 0.2 × 1.0 µm).  
- **Isotropic**: spacing equal along axes → cubes; **anisotropic**: one axis differs (common in microscopy & clinical CT).  
- **Always set spacing** in your viewer/exporter.  
  - In napari, set “Scale” in layer properties.  
  - In VTK/ParaView, set “Data Spacing” or use image origin/spacing fields.  
- **Resample** if needed (trade speed vs fidelity): upsample Z for nicer isosurfaces; downsample big XY for faster previews.

---

## Voxel‑Based Images
### Visualizing volumetric datasets

{{< notes >}}
Pick the simplest technique that answers your question; only step up to full volume rendering when slices and isosurfaces aren’t enough.
{{< /notes >}}

- **Slice‑based**: axial/sagittal/coronal (medical) or arbitrary oblique slices.  
- **Maximum/Minimum Intensity Projections (MIP/MinIP)**: great for vessels or bright structures.  
- **Emission‑absorption (volume ray casting)**: assign color + opacity by intensity (“transfer function”); can add lighting.  
- **Isosurface**: fast surface extraction at a threshold (marching cubes) for clean boundaries.

{{<horizontal>}}
{{< figure src="img/volume-rendering.png" caption="Slicing, Max. Intensity, Emission Absorbtion">}}
{{< figure src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/76/Volume_ray_casting.svg/2560px-Volume_ray_casting.svg.png" caption="[Thetawavederivative work: Florian Hofmann, CC BY-SA 3.0](https://commons.wikimedia.org/w/index.php?curid=14521474)">}}
{{</horizontal>}}

---

## Voxel‑Based Images
## Volume Rendering in napari

{{< notes >}}
**napari** is a Python-based tool designed for interactive visualization of 2D/3D image data. It supports 
multi-channel volume rendering, making it a great option for smaller datasets that require quick exploration in 3D. napari also integrates well with the Python scientific stack, allowing users to run analysis code alongside the visualization.
{{< /notes >}}

- **Interactive visualization and annotation**: Offers tools for exploring data and annotating images in real-time.
- **Layer-based rendering**: Supports multiple layers like images, labels, points, and shapes for versatile data representation.
- **Plugin extensibility**: Easily extendable through plugins to add custom functionality.
- **Integration with Python ecosystem**: Seamlessly works with NumPy, Dask, and other scientific Python libraries.

{{<citations>}}
- [napari contributors (2019). napari: a multi-dimensional image viewer for python. doi:10.5281/zenodo.3555620](https://zenodo.org/record/3555620)
- https://github.com/napari/napari
{{</citations>}}

---

## Voxel‑Based Images
### Praxis: Visualizing volumes with napari

{{< notes >}}
We start GUI‑first for confidence, then show a short notebook recipe you can adapt. Replace the sample with your own data later.
{{< /notes >}}

1. **Open napari** → *File → Open…* a 3D stack (TIFF/OME‑TIFF/NIfTI/Zarr).  
2. In the **Layers** panel, select your image layer:  
   - Set **Scale** to the correct voxel spacing (e.g., `0.2, 0.2, 1.0`).  
   - Switch **2D → 3D** (bottom left bar).  
   - In **Rendering**, try: **MIP**, **Translucent/Attenuated**, **Iso**.  
3. Adjust the contrast limits and colormap; add a **labels** layer if you have a segmentation.  
4. *File → Save Screenshot* to export a figure (optionally with a transparent background).

---

## Photogrammetry

{{<horizontal>}}

{{<block style="margin-right: 40px">}}
{{<figure src="img/logos/dkfz.png" height="50px" class="image-right">}}
{{<figure src="img/logos/hzb-logo-a4-rgb.jpg" height="80px" class="image-right">}}
{{</block>}}

{{</horizontal>}}
<div style="margin-left: 40px; font-size: 60%">Jan-Simon Schmidt (HZB), Ole Johannsen (DKFZ, Helmholtz Imaging), Deborah Schmidt (MDC, Helmholtz Imaging)</div>

{{< notes >}}
Experiments in BESSY II change regularly, making tracking those changes - e.g. for planning additional experiments - necessary. Common surveying techniques are laborious and offer unneeded accuracy. Thus, we provide a pragmatic solution where the status quo is reconstructed from drone video footage. The resulting 3D reconstruction can be rendered from above using orthogonal projection. Overlaying this rendering with the original 2D plans gives valuable information about the differences between the status quo and the theoretical plans.
{{< /notes >}}

{{<figure src="img/bessy2-top.jpg">}}

---

## Photogrammetry

{{< notes >}}
This is the on‑ramp from photos to 3D. It produces both dense point clouds and textured meshes that flow into your next steps.
{{< /notes >}}

* **What is it?** Recover camera poses (SfM) → compute depth (MVS) → output **dense point cloud** and **mesh+texture**.
* **Acquire (by domain):** Drone surveys, cultural heritage, lab setups; consistent overlap & fixed focal preferred.
* **Used for:** Reconstruction, measurement, communication, web sharing.
* **Stored as:** Images + camera models, PLY/OBJ/GLB mesh, LAS/PLY point cloud, optional orthomosaics/DEMs.
* **Visualized with:** Mesh or point‑based viewers; geospatial tools when georeferenced.

---

## Point clouds

* **What is it?** A set of 3D points with attributes (intensity, color, class, time…).
* **Acquire (by domain):**
  * **LiDAR** (ground/airborne), depth sensors.
  * **Photogrammetry** (dense matching).
  * **Microscopy** (particle centers, single‑molecule localizations).
* **Used for:** Mapping, fitting, statistics, reconstruction.
* **Stored as:** LAS/LAZ, E57, PLY, CSV/Parquet; for the web: **EPT** (Entwine Point Tiles).
* **Visualized with:** Point rendering (“Point Gaussian”), color by attribute, subsampling & LODs.

---

## Point clouds

{{< horizontal >}}

{{< block >}}

**Rendering challenges**

* No connectivity → consider **surface reconstruction** (e.g., Poisson, alpha‑shapes) when needed.
* Often noisy & redundant → **filter**, **align**, **downsample**, and **normalize** intensities.

{{< /block >}}

{{< block >}}

{{< figure src="img/forest_digitaltwin_rizaldy_web.jpg" width="800">}}
Aldino Rizaldy, Sam Thiele, Sharad Kumar Gupta, HZDR
{{< /block >}}

{{< /horizontal >}}


---


## Point Clouds

{{< horizontal >}}
{{< block style="flex:1.7">}}
### Domain-Specific Variants
* Many scientific domains represent data as points in 3D space with domain-specific attributes.
  * **Atoms in molecules** → standardized formats (PDB, mmCIF), rendered as spheres/bonds
  * **Stars in astronomy** → catalogs (FITS, VOTable), rendered as brightness-colored points
  * **Cells in microscopy** → tables or SWC/OME formats, rendered as centroids or markers
* Same principles apply, but with tailored **formats & rendering techniques**
{{< /block >}}

{{< figure src="img/molecularnodes.png" style="margin-bottom: 50px">}}
{{< /horizontal >}}

{{< notes >}}
Across domains, point clouds represent very different entities, but always follow the same idea: a collection of points with attributes. What changes are the **formats used to store them** and the **rendering techniques** adapted to each scientific field.
{{< /notes >}}

---

## Point clouds
### Praxis: Visualizing point clouds with ParaView

{{< notes >}}
ParaView handles both tiny and large point clouds. We start simple and add useful filters step by step.
{{< /notes >}}

1. *File → Open…* a **LAS/LAZ/PLY** or CSV with XYZ.
2. Click **Apply**. In the **Properties** panel:

   * Set **Representation = Point Gaussian** for smooth points.
   * Increase **Gaussian Radius** until points visually connect.

---

## Point clouds
### Praxis: Visualizing point clouds with ParaView

3. Add filters as needed (*Filters → Search*):

   * **Clip** (box/plane) to isolate a region.
   * **Decimate (Points)** or **Mask Points** to downsample for speed.
4. Save a screenshot or *File → Export Scene* for vector graphics.

---

## Meshes

{{< notes >}}
Meshes are compact and ideal for publication‑quality renders, measurement on surfaces, and simulation boundaries.
{{< /notes >}}

{{< horizontal >}}

* **What is it?** Vertices + faces define a continuous surface.
* **Acquire (by domain):** From segmentation (marching cubes), CAD, photogrammetry, simulation output.
* **Used for:** Visualization, 3D printing, analysis (curvature/area), animation.
* **Stored as:** STL, PLY, OBJ, GLB/GLTF, VTP; textures as PNG/JPEG; materials in MTL/GLTF.
* **Visualized with:** Smooth shading, **PBR materials** (Physically-Based Rendering, for textured assets), scalar maps, cuts/slices.

{{< figure src="img/mesh-rendering.png" style="width: 500px">}}
{{< /horizontal >}}

---

## Mesh processing
### Tools

{{< notes >}}
Once a mesh is generated from a volumetric dataset, further **processing** may be necessary to refine the mesh for better performance, rendering, or analysis. One of the most popular tools for mesh processing is **MeshLab**, an open-source application for cleaning, repairing, and optimizing 3D meshes. 
{{< /notes >}}

- **MeshLab**: A powerful tool for cleaning, decimating, and refining 3D meshes. It supports:
  - **Smoothing**: Remove sharp edges or rough areas in the mesh.
  - **Decimation**: Reduce the number of polygons while maintaining the overall shape.
  - **Repair**: Fix holes or non-manifold geometry in the mesh for better usability.

- **Other tools**: Blender and VTK also offer additional mesh processing capabilities.

---

{{< cover src="img/single-betacell.jpg" background="black" color="white" title="Rendering meshes" >}}

{{< citations >}}
- [© Müller et al. https://doi.org/10.1083/jcb.202010039](https://rupress.org/jcb/article/220/2/e202010039/211599/3D-FIB-SEM-reconstruction-of-microtubule-organelle) 
{{</ citations >}}

{{< /cover >}}

{{< notes >}}
Rendering meshes involves converting mesh data into visually meaningful images, taking into account surface 
properties, lighting, and camera angles. Spending time on rendering approaches matching your use case is a way of 
defining how to tell the story of your dataset.
{{< /notes >}}

---

## Meshes
### Rendering pipeline

{{< notes >}}
In **3D rendering**, the graphics pipeline is responsible for transforming 3D coordinates into 2D pixels on the screen. This process involves several stages, where each step takes the output from the previous stage and prepares the data for the next. The pipeline efficiently transforms vertex data into pixels using **shaders**, small programs that run on the **GPU** to accelerate rendering. The pipeline can be divided into two main parts: **geometry processing** (converting 3D coordinates into 2D) and **fragment processing** (turning 2D data into colored pixels).
{{< /notes >}}

{{< horizontal >}}

* **Vertex shader**: places points in the scene.
* **Geometry (optional)**: can add/quench primitives.
* **Fragment shader**: colors pixels using lights/materials/textures.
* **Depth & blending**: decide what’s in front and how transparent things mix.

{{<figure src="https://learnopengl.com/img/getting-started/pipeline.png" caption="Credit: Joey de Vries,https://learnopengl.com/, CC BY 4.0">}}

{{< /horizontal >}}

{{< citations >}}
- [Hello Triangle on learnopengl.com](https://learnopengl.com/Getting-started/Hello-Triangle) 
{{</ citations >}}

---

## Meshes
### Praxis: Visualizing meshes with ParaView

{{< notes >}}
This flow works for STL/PLY/OBJ/VTK meshes and keeps results reproducible.
{{< /notes >}}

1. *File → Open…* a mesh → **Apply**.
2. **Lighting/shading**: set **Representation = Surface**.

---

## Vector fields
### Grids and unstructured meshes

{{< notes >}}
Two big families: grid‑based (uniform/rectilinear/curvilinear) and unstructured (vectors at mesh points/cells). Steady vs time‑dependent changes which tracer you use.
{{< /notes >}}

* **What is it?** A vector (ux,uy,uz) per location; often paired with scalars (pressure, temperature).
* **Acquire (by domain):** CFD/FEA, climate/ocean models, MRI‑flow, EM fields.
* **Used for:** Flow direction/speed, vortices, transport, streamline topology.
* **Stored as:**
  * **Structured grids**: VTI/NetCDF/XDMF+HDF5; rectilinear or curvilinear coordinates.
  * **Unstructured**: VTU/VTK with per‑point or per‑cell vector arrays.

---

## Vector fields
### Grids and unstructured meshes

* **Visualized with:**
  * **Glyphs** (arrows/cones) scaled by magnitude.
  * **Streamlines** (steady) or **pathlines/particle tracers** (time‑varying).
  
---

## Vector fields
### Praxis: Visualizing vector fields with ParaView

{{< notes >}}
We’ll use a tiny sample. The same recipe works on structured or unstructured data.
{{< /notes >}}

1. *File → Open…* a VTK/VTU/VTI/XDMF/NetCDF file with vectors → **Apply**.
2. **Glyphs**: *Filters → Glyph*.

   * **Vectors** = your vector array (e.g., Velocity).
   * **Scale by** = vector magnitude; set a sensible **Scale Factor**.
   * Pick **Glyph Type = Arrow** (or Cone) → **Apply**.


---

## It's your turn!

- open Napari to look at 3D Pixel data
- open Paraview to look at Meshes, Point Clouds, and Vector Fields

{{< figure src="img/paraview/paraview-vector-field.png" style="width: 1000px">}}