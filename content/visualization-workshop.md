---
title: "3D Data Visualization Workshop"
date: 2024-09-09
draft: false
layout: workshop
author: Deborah Schmidt
author_position: Head of Helmholtz Imaging Support Unit
description: In this workshop, we delve into various approaches and methodologies for visualizing 3D datasets. 
cover: img/bg.jpg
---

## Introduction

{{< notes >}}
Let me briefly introduce myself.
{{</ notes >}}

{{< person-bio name="Deborah Schmidt" img="img/people/deborah.jpg" position="Head of Helmholtz Imaging Support Unit at MDC" >}}
* TODO

{{</ person-bio >}}

---

## Introduction

{{< horizontal >}}
{{< block >}}

### Meet the Helmholtz Imaging Support Units!

We are here to support you in case you have any questions or need support.

### .. working in close collaboration with the Helmholtz Imaging Research Units.

{{< logos >}}img/logos/desy.png
img/logos/dkfz.png
img/logos/mdc.png{{< /logos >}}

{{< /block >}}

{{< figure src="img/people/hi-support-staff.jpg" >}}

{{< /horizontal >}}

---

## Introduction
### Consulting along the entire pipeline and across all research domains
{{< notes >}}
You can contact us with any question along the imaging pipeline. We are funded to support all Helmholtz centers in 
Germany, but you can also reach out to us if you don't belong to Helmholtz.
{{</ notes >}}
{{< center >}} **support@helmholtz-imaging.de** {{< /center >}}
{{< figure src="img/pipeline.png" >}}


---

## Automation of rendering tasks
{{< notes >}}
According to feedback from the community, automating visualization tasks is often harder than other tasks, because 
it often involves the use of graphical interfaces. Additionally, one often requires a whole list of tools to 
complete a full workflow from preparing to rendering the data. My team works on a  framework called [**Album**](https://album.solutions) which can provide executable entry points into diverse tools, so 
that they can be launched from the same interface and tailored to automate specific use cases.

Album manages separate virtual environments for each solution managed internally by micromamba to avoid version conflicts. Each solution can run custom installation and run scripts, written in Python, in these environments. Since Python runs across platforms, this enables us to write custom launchers and execution routines for a variety of software.
{{< /notes >}}

TODO

---

## Automation of rendering tasks
### Album installation & the Image Challenges catalog
{{< notes >}}
If you want to run any of the Album solutions mentioned in this workshop, please check out this tutorial on how to 
install Album and how to add a catalog of solutions to your local album collection. Please install the following 
catlog (as described in the tutorial):
{{< center >}} **`https://gitlab.com/album-app/catalogs/image-challenges.git`** {{< /center >}}

{{< /notes >}}

{{< tutorial-link link="tutorial-album-user" >}}

---

## 3D Dataset types

{{< notes >}}
- Understanding the type of data you are working with is crucial for effective 3D rendering. Below, we outline the 
common categories of datasets that are often visualized in three dimensions. Did we miss something? Let us know in the comment section below!
{{< /notes >}}
- **Voxel-Based Datasets**
{{< notes >}}
- These are typically 3D grids of values representing a volume, where each individual grid cell or "voxel" holds a 
  specific value. Voxel-based datasets are common in medical imaging (e.g., MRI, CT scans), geospatial analysis, and fluid dynamics simulations. They can be visualized using techniques like volume rendering, isosurface extraction, and slice-based views.
{{< /notes >}}

- **Labels and Segmentations**
{{< notes >}}
- These are specialized 3D datasets that contain binary or integer values, often used to delineate structures within 
  a larger dataset. For instance, in a medical context, they might identify specific organs or lesions within an MRI scan. Visualization techniques for labels and segmentations may include color mapping, overlaying onto the original 3D dataset, or interactive 3D views for exploration.
{{< /notes >}}

- **Meshes**
{{< notes >}}
- Meshes are composed of vertices, edges, and faces that define the shape of 3D objects. Meshes are common in 
  computer graphics, CAD models, and finite element analysis. They can be visualized through techniques like surface rendering, wireframe views, and texture mapping. Additionally, properties like curvature or data fields can be color-mapped onto the mesh for better interpretation.
{{< /notes >}}

- **Point Clouds** - not covered here
{{< notes >}}
- Point clouds consist of a set of points in a 3D coordinate system, usually defined by X, Y, and Z coordinates. 
  These datasets can come from various sources such as LiDAR, 3D scanning, or particle simulations. Visualization strategies might include point-based rendering techniques, surface reconstruction, and various filtering methods to emphasize features of interest.
{{< /notes >}}

- **Tables and Statistical Data** - barely covered here
{{< notes >}}
- These are often auxiliary datasets that accompany the primary 3D data, containing derived analysis results or 
  metadata. For example, tables could contain quantitative measures associated with specific regions in a segmented 3D volume. Visualization for these types of data might include interactive tables that link to 3D views or statistical plots integrated within the 3D visualization environment.
{{< /notes >}}

- **Time-Series Data** - not covered here
{{< notes >}}
- While not inherently 3D, time-series data can add a temporal dimension to any of the above datasets, making them 4D. This is often the case in dynamic simulations or time-lapse imaging studies. Visualization strategies might include animation, timeline sliders, or real-time interactive exploration.
{{< /notes >}}

---

## 3D Dataset types
### Voxel space vs. object space
{{< notes >}}
TODO
- explain the diffencre between voxel based images and meshes
- 
{{< /notes >}}

TODO

---

## Visualizing volumetric datasets
{{< notes >}}
Volumetric datasets, such as medical imaging (CT/MRI scans) or fluid simulations, are complex datasets where each voxel represents a value in 3D space. In this section, we'll explore the various techniques available for rendering and interacting with volumetric data. 
{{< /notes >}}

- **Volume Rendering**: This is a common method for visualizing 3D datasets where voxel-based data is rendered directly. Tools like ParaView and Fiji provide options for volume rendering.
- **Isosurface Extraction**: A method to extract 3D surfaces from volumetric data. Popular algorithms include Marching 
  Cubes and Marching Tetrahedrons.
- **Slice-Based Visualization**: This involves rendering 2D cross-sections or "slices" of the 3D dataset, often used in 
  medical imaging.

{{< figure src="img/volume-rendering.png" >}}

---

## Visualizing volumetric datasets
### Region Of Interests (ROIs) / Labels

{{< notes >}}
Regions of interest (ROIs) are often specific parts of a 3D dataset that you want to focus on or analyze in detail. Here, we explore tools and methods to select, highlight, and visualize ROIs in 3D datasets. 
{{< /notes >}}

TODO

---

## Visualizing volumetric datasets
### ImageJ, napari, pygfx?
{{< notes >}}
TODO
{{< /notes >}}

{{< tutorial-link link="tutorial-volume-rendering-native-tools" >}}

---

## Visualizing volumetric datasets
### BigDataViewer, BigVolumeViewer, SciView, and LabelEditor
{{< notes >}}
TODO
{{< /notes >}}

{{< tutorial-link link="tutorial-volume-rendering-bdv" >}}

---

## Visualizing volumetric datasets
### Web based rendering with Neuroglancer
{{< notes >}}
A web-based 3D viewer allows for interactive visualization directly in the browser without needing specialized software. These viewers can be embedded into web pages or shared with collaborators. 
{{< /notes >}}

{{< tutorial-link link="tutorial-volume-rendering-neuroglancer" >}}

---

## Converting volumetric datasets into meshes
{{< notes >}}
TODO
{{< /notes >}}

{{< figure src="img/annotation-conversion.jpg" >}}

---

## Converting volumetric datasets into meshes
### Annotation Or No Annotation
{{< notes >}}
TODO
{{< /notes >}}

TODO

---

## Converting volumetric datasets into meshes
### Marching Cubes
{{< notes >}}
TODO
{{< /notes >}}

TODO

---

## Converting volumetric datasets into meshes
### Optimization
{{< notes >}}
TODO
{{< /notes >}}

{{< figure src="img/mesh-conversion-optimization.jpg" >}}

---

## Converting volumetric datasets into meshes
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

## Converting volumetric datasets into meshes
### Conversion scripts
{{< notes >}}
TODO
{{< /notes >}}

{{< tutorial-link link="tutorial-mesh-conversion" >}}

---

## Mesh processing
{{< notes >}}
TODO Mention MeshLab
{{< /notes >}}
TODO
---

{{< cover src="img/single-betacell.jpg" background="black" color="white" title="Rendering meshes" >}}

{{< citations >}}
- [Müller, A., Schmidt, D. et al. **Modular segmentation, spatial analysis and visualization of volume 
  electron microscopy datasets.** Nat Protoc 19, 1436–1466 (2024).](https://doi.org/10.1038/s41596-024-00957-5) 
{{</ citations >}}

{{< /cover >}}

{{< notes >}}
TODO intro to rendering meshes and what effect proper rendering can have 
{{< /notes >}}

---

## Rendering meshes
### Rendering pipeline
{{< notes >}}
TODO
{{< /notes >}}

TODO

---

## Rendering meshes
### Rendering meshes with VTK
{{< notes >}}
TODO
{{< /notes >}}

TODO
{{< tutorial-link link="tutorial-mesh-rendering-vtk" >}}

---

## Rendering meshes
### Rendering meshes with Blender
{{< notes >}}
TODO
{{< /notes >}}

TODO
{{< tutorial-link link="tutorial-mesh-rendering-blender" >}}

---

## Rendering meshes
### Cutting volumes in Blender
{{< notes >}}
Blender’s powerful modeling and sculpting tools allow users to cut and manipulate 3D meshes. In this section, we'll cover techniques for cutting volumes to expose internal structures or focus on specific regions. 
{{< /notes >}}

{{< tutorial-link link="tutorial-mesh-cutting-volumes-blender" >}}

{{< figure src="img/cutting-volumes.jpg" >}}

---

## Rendering meshes
### Transparency
{{< notes >}}
Transparency can be used for highlighting specific parts of a scene by hiding others. It can also help to improve 
visibility of objects in very complex scenes. Glass - like textures are also popular for realistic, graspable 
renderings.
{{< /notes >}}

- **Transparency**: See-through materials where objects behind are fully visible. Common for windows and water surfaces.
- **Translucency**: Light passes through, but objects behind appear blurred or diffused. Used for simulating skin, leaves,
  or frosted glass.
- **Glass**: Combines transparency with refraction and reflection, used for lenses or architectural glass.

{{< tutorial-link link="tutorial-mesh-rendering-transparency" >}}

---

## Choosing colors
### Color palettes
{{< notes >}}
Selecting an appropriate color palette is crucial for both aesthetic and functional reasons in 3D visualizations. It can help emphasize key elements and ensure the visual representation is clear and accessible. 
{{< /notes >}}

{{< figure src="img/color-palettes.jpg" >}}

{{< citations >}}
- [https://coloors.io](https://coloors.io) 
{{</ citations >}}

---

## Choosing colors
### Color theory
{{< notes >}}
Understanding color theory is essential for selecting effective color schemes in 3D visualization. Proper use of color can enhance the readability of complex datasets and guide the viewer’s attention to key features. 
{{< /notes >}}

- **Complementary Colors**: These are colors directly opposite each other on the color wheel, which can create strong 
visual contrast.
- **Analogous Colors**: These are adjacent to each other on the color wheel, creating harmony in the design.
- **Triadic Colors**: This scheme uses three colors evenly spaced on the color wheel, providing both contrast and balance.

---

## Choosing colors
### Color accessibility
{{< notes >}}
Color accessibility is essential to ensure that your visualizations can be interpreted by individuals with color vision deficiencies. By selecting accessible color palettes, you can improve the inclusivity of your visualizations.
{{< /notes >}}

{{< figure src="img/color-accessibility.jpg" >}}

- **Fiji  ▷ Image ▷ Color ▷ Simulate Color Blindness**

---

## Choosing colors
### Tipps for choosing colors
{{< notes >}}
TODO
{{< /notes >}}

{{< tutorial-link link="tutorial-choosing-colors" >}}

---

## The next big thing / missing content
{{< notes >}}
TODO
{{< /notes >}}

- Web based viewers
- High Throughput
- Automated workflows
- Dimensionality reduction
- Animation
- Point cloud handling
- Time series


---

## Thank you!
{{< unlisted >}}
{{< notes >}}
Thank you for attending this workshop. Feel free to reach out for further assistance or to explore 
more visualization techniques! 
{{< /notes >}}

TODO