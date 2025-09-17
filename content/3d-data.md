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

## Introduction
{{< unlisted >}}
{{< horizontal >}}
{{< block >}}
Hi, I'm Deborah, head of the Helmholtz Imaging Support Unit at MDC.

### Helmholtz Imaging is here for you with Support Units at 3 centers, working in close collaboration with the Helmholtz Imaging Research Units.
{{< logos >}}img/logos/desy.png
img/logos/dkfz.png
img/logos/mdc.png{{< /logos >}}

{{< /block >}}

{{< figure src="img/hi-support-staff.jpg" caption="Members of all Helmholtz Imaging Support Units." >}}

{{< /horizontal >}}

---

## Introduction
{{< unlisted >}}
### Consulting along the entire pipeline and across all research domains
{{< notes >}}
You can contact us with any question along the imaging pipeline. We are funded to support all Helmholtz centers in 
Germany.
{{</ notes >}}
{{< center >}} **support@helmholtz-imaging.de** {{< /center >}}
{{< figure src="img/pipeline.png" >}}

---

## Coming up: Image Quality Assessment
{{< unlisted >}}
{{< horizontal >}}

{{< block style="margin-right: 20px">}}
{{< figure src="img/illus_how_we_got_here.png" width="600" >}}
{{< /block >}}

{{< block style="margin-right: 20px">}}
{{< figure src="img/pixel-patrol-plots.png" style="box-shadow: 0 6px 20px 0 #bbbbbb">}}
{{< /block >}}


{{< block style="margin-left: 80px">}}
Pixel Patrol
{{< qr-code identifier="pixel-patrol" link="https://github.com/ida-mdc/pixel-patrol">}}
{{< /block >}}

{{< /horizontal >}}

{{<citations>}}
- https://github.com/ida-mdc/pixel-patrol
{{</citations>}}

---

## Coming up: 3D Visualization Workshop

{{< unlisted >}}

{{< horizontal >}}

{{< block >}}

In-person workshop

Date: **10–13 Nov 2025**

Organized in cooperation with Helmholtz Information & Data Science Academy (HIDA) and Helmholtz Imaging

- {{< qr-code identifier="vis-workshop" link="https://events.hifis.net/event/2781/">}}

https://events.hifis.net/event/2781/

{{< /block >}}

{{< block style="font-size: 80%">}}

**Preliminary program**

Day 1: 3D Data Types, Image Assessment, and  Volumetric Rendering

Day 2: Web-Based Viewers, Mesh Processing and Blender Rendering

Day 3: Storytelling with Visualization / Project Work

Day 4: Project Work and Presentations

{{<figure src="img/workshop.png" width="500">}}

{{< /block >}}


{{< /horizontal >}}


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

{{< /block >}}

{{< /horizontal >}}

---

## 3D Dataset types
### Voxel-Based Images

- Represent the **entire volume** of an object in a structured grid.
- Each voxel holds a **scalar value**, often representing intensity in medical scans or simulation data.
- Best for representing **interior** details of a structure, e.g., in **CT/MRI scans** or simulations.
- **Volumetric rendering** and **slice-based views** are common visualization techniques.

{{<figure src="img/voxel-based-data.png" caption="Voxel based data representation. Credit: [Hasanov, S. et al. (2021), CC BY-SA 4.0](https://www.researchgate.net/publication/353527450_Hierarchical_homogenization_and_experimental_evaluation_of_functionally_graded_materials_manufactured_by_the_fused_filament_fabrication_process).">}}

---

## Visualizing volumetric datasets
{{< notes >}}
Volumetric datasets, such as medical imaging (CT/MRI scans) or fluid simulations, are complex datasets where each voxel represents a value in 3D space. In this section, we'll explore the various techniques available for rendering and interacting with volumetric data. 
{{< /notes >}}

- **Slice-Based Visualization**: This involves rendering 2D cross-sections or "slices" of the 3D dataset, often used in 
  medical imaging.
- **Volume raycasting** (max intensity, emission absorbtion)

{{<horizontal>}}
{{< figure src="img/volume-rendering.png" caption="Slicing, Max. Intensity, Emission Absorbtion">}}
{{< figure src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/76/Volume_ray_casting.svg/2560px-Volume_ray_casting.svg.png" caption="[Thetawavederivative work: Florian Hofmann, CC BY-SA 3.0](https://commons.wikimedia.org/w/index.php?curid=14521474)">}}
{{</horizontal>}}

---

## Visualizing volumetric datasets
### Transfer functions
{{< notes >}}
When working with **unannotated** volumetric datasets, you can explore the data interactively using **transfer functions**. Transfer functions map intensity values in the dataset to colors and opacities, allowing you to visualize different regions of the volume without defining hard boundaries. This technique is often used for soft, exploratory visualizations of the internal structures of the data.

**Transfer Functions**:
- A transfer function defines how data values are mapped to colors and transparency.
- Example: Low intensity values may be mapped to transparent regions, while higher intensities are mapped to visible colors.
- Transfer functions are typically adjusted in visualization software like **ParaView**.
- By adjusting transfer functions, you can emphasize specific parts of the volume without needing concrete borders or segmentations.
{{< /notes >}}

{{< horizontal >}}

{{< figure src="img/llustrative-volume-rendering-using-a-style-transfer-function-Images-a-d-depict.png">}}

{{<figure src="img/transferfunction1.png" width="500px">}}

{{< /horizontal >}}

{{<citations>}}
- Figure by Stefan Bruckner from the following publication: [Bruckner, Stefan & Gröller, Eduard. (2007). Style Transfer Functions for Illustrative Volume Rendering. Computer 
  Graphics Forum. 26. 715 - 724. 10.1111/j.1467-8659.2007.01095.x.](https://www.researchgate.net/publication/227615609_Style_Transfer_Functions_for_Illustrative_Volume_Rendering)
{{</citations>}}

---

## Visualizing volumetric datasets
### Transfer functions
{{< notes >}}
When working with **unannotated** volumetric datasets, you can explore the data interactively using **transfer functions**. Transfer functions map intensity values in the dataset to colors and opacities, allowing you to visualize different regions of the volume without defining hard boundaries. This technique is often used for soft, exploratory visualizations of the internal structures of the data.

**Transfer Functions**:
- A transfer function defines how data values are mapped to colors and transparency.
- Example: Low intensity values may be mapped to transparent regions, while higher intensities are mapped to visible colors.
- Transfer functions are typically adjusted in visualization software like **ParaView**.
- By adjusting transfer functions, you can emphasize specific parts of the volume without needing concrete borders or segmentations.
{{< /notes >}}

{{< horizontal >}}

{{< figure src="img/llustrative-volume-rendering-using-a-style-transfer-function-Images-a-d-depict.png">}}

{{<figure src="img/transferfunction2.png" width="500px">}}

{{< /horizontal >}}

{{<citations>}}
- Figure by Stefan Bruckner from the following publication: [Bruckner, Stefan & Gröller, Eduard. (2007). Style Transfer Functions for Illustrative Volume Rendering. Computer 
  Graphics Forum. 26. 715 - 724. 10.1111/j.1467-8659.2007.01095.x.](https://www.researchgate.net/publication/227615609_Style_Transfer_Functions_for_Illustrative_Volume_Rendering)
{{</citations>}}

---

## Visualizing volumetric datasets
### Demonstration

{{< horizontal >}}

{{<figure src="img/head-3dviewer.png" caption="3DViewer">}}
{{<figure src="img/head-bdv.png" caption="BigDataViewer">}}
{{<figure src="img/head-mobie.png" caption="Mobie (BigVolumeViever)">}}

{{< /horizontal >}}

---

## Visualizing volumetric datasets

{{< horizontal >}}

{{< block >}}

### Why OME-ZARR?

- Image stored in chunks as files on disk
- Image stored in different resolutions
- Open Microscopy Environment specification format (OME-NGFF)

{{< /block >}}

{{<figure src="img/resolution-pyramid.png" width="600">}}

{{< /horizontal >}}

---

## Visualizing volumetric datasets
### BigDataViewer Ecosystem
{{< notes >}}
Fiji is still choice number one for many who want to inspect an image quickly, mainly because it supports a vast 
number of data formats. While Fiji can already render 3D data with its built in 3D Viewer, it also comes with 
BigDataViewer (BDV), a great tool for arbitrary slicing of 3D data of any size. A whole ecosystem of tools based on BDV 
has evolved over time, which we will explore in the tutorial linked below.
{{< /notes >}}

- **Supports large data formats**: The BDV ecosystem can handle massive 3D datasets and allow arbitrary slicing.

{{< tutorial-link link="tutorial-volume-rendering-bdv" >}}

---

## Visualizing volumetric datasets
### Web based rendering with Neuroglancer
{{< notes >}}
A web-based 3D viewer allows for interactive visualization directly in the browser without needing specialized software. These viewers can be embedded into web pages or shared with collaborators. 
The following tutorial does not come with a full overview of existing web based viewers, but offers insight into a 
project we are working on at MDC where we utilize Neuroglancer to display large scale mice brains online. 
{{< /notes >}}

- **Collaboration-friendly**: Share URLs with collaborators to provide access to the 3D visualization.

{{< tutorial-link link="tutorial-volume-rendering-neuroglancer" >}}

---

## Visualizing volumetric datasets
### Python based tools
{{< notes >}}
With the rise of popularity of Python as a script and programming language in the life sciences and beyond, let's 
look at Python based volumetric rendering in the tutorial linked below. We will look at Napari, Pygfx, and VTK. It 
is worth mentioning that he last two tools are also great resources for rendering mesh based datasets.  
{{< /notes >}}

{{< tutorial-link link="tutorial-volume-rendering-python" >}}

---

{{< notes >}}
Meshes and point clouds are are irregularly structured and optimized for representing surfaces or discrete samples of geometry.
Point Clouds: Collections of discrete points in 3D space, often obtained directly from sensors (e.g., LiDAR, microscopes, drone scans). They represent raw spatial samples without explicit connectivity.
{{< /notes >}}

## 3D Dataset types
### Point Clouds

{{< horizontal >}}
{{< block >}}

A **set of discrete points in 3D space**, each with coordinates (X, Y, Z) and optional attributes (intensity, color, normals, timestamps, ..).


Commonly acquired from:
  * **LiDAR scanners** (environment mapping)
  * **Microscopy & tomography** (particle detection, molecule positions)
  * **Photogrammetry & drone scans** (environment reconstruction)
{{< /block >}}

{{< block >}}
Rendering Challenges:
  * Lack of connectivity → needs **surface reconstruction** for continuous models.
  * Often contains noise and redundancy → requires **filtering, alignment, subsampling**.
{{< /block >}}
{{< /horizontal >}}

---

## Project BESSY2 Reconstruction

{{<horizontal>}}
### Helmholtz Imaging Collaboration

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

## Project BESSY2 Reconstruction
### Workflow & Tools

* Extract point clouds from frames of drone video footage
* **Clean & rotate, and merge point clouds** (using *CloudCompare*)
* **Render results in Blender** for inspection & visualization
* **Convert to Potree format** (multi resolution)
* **Upload to public server** → Accessible in browser with **Potree** (open-source WebGL based point cloud renderer for large point clouds)

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

## 3D Dataset types
### Meshes

{{< notes >}}
Meshes: Networks of vertices, edges, and faces describing a continuous surface. They are ideal for modeling and rendering shapes and boundaries.
{{< /notes >}}
{{< horizontal >}}
{{< block style="flex:1.7">}}
* Represent **surfaces** of objects (not interiors).
* Built from **vertices, edges, and faces** (usually triangles).
* Compact representation compared to voxels → ideal for storing **geometry**.
* Visualization techniques: **surface shading, wireframe rendering, texture mapping, scalar field overlays**.
{{< /block >}}

{{< figure src="img/mesh-rendering.png" style="width: 500px">}}
{{< /horizontal >}}

{{< notes >}}
Meshes excel when surface properties are more important than volume. They allow computation of curvature, surface area, or mapping of experimental data onto geometry. 
{{< /notes >}}

---

## Converting volumetric datasets into meshes

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

## Converting volumetric datasets into meshes
### Marching Cubes
{{< notes >}}
The **Marching Cubes algorithm** is one of the most popular methods for extracting a 3D surface from volumetric data. It identifies the points in a voxel grid where the dataset crosses a specific threshold value (the **isosurface**) and uses those points to generate a mesh.

{{< /notes >}}

{{< figure src="img/MarchingCubesEdit.svg" height="700px" caption="Marching cubes algorithm. Credit: [Ryoshoru, Jmtrivial on Wikimedia](https://commons.wikimedia.org/wiki/File:MarchingCubesEdit.svg), CC BY-SA 4.0">}}

---

## Converting volumetric datasets into meshes
### Optimization

- **Binary masks** vs. **Probability maps**

{{< notes >}}
When converting volumetric data to meshes, **optimizing** the output is crucial for achieving smooth and accurate 
results. One good approach is using **probability maps** rather than binary masks as input for the **Marching Cubes 
algorithm**. 
- **Binary masks**: Create rough, blocky meshes because the data is thresholded into hard 0/1 values, losing subpixel detail.
- **Probability maps**: Offer smoother results, as the algorithm can detect gradients between regions, improving mesh precision at subpixel levels.
{{< /notes >}}

{{< figure src="img/mesh-conversion-optimization.jpg" >}}

---

## Converting volumetric datasets into meshes
### Conversion scripts
{{< notes >}}
While several tools include converting volumetric datasets into meshes, VTK has worked particularly well in our 
experience. Check out the tutorial below for more details. This includes Python code snippets, but also the 
possibility to run conversion through a graphical user interface or command line using an Album solution.
{{< /notes >}}

{{< tutorial-link link="tutorial-mesh-conversion" >}}

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

## Rendering meshes
### Rendering pipeline
{{< notes >}}
In **3D rendering**, the graphics pipeline is responsible for transforming 3D coordinates into 2D pixels on the screen. This process involves several stages, where each step takes the output from the previous stage and prepares the data for the next. The pipeline efficiently transforms vertex data into pixels using **shaders**, small programs that run on the **GPU** to accelerate rendering. The pipeline can be divided into two main parts: **geometry processing** (converting 3D coordinates into 2D) and **fragment processing** (turning 2D data into colored pixels).
{{< /notes >}}

{{< horizontal >}}
- **Vertex Shader**: Transforms 3D coordinates and applies basic vertex processing.
- **Geometry Shader** (optional): Generates new geometry from existing primitives.
- **Fragment Shader**: Computes the final color of each pixel.
- **Blending and Depth Testing**: Determines how pixels are blended and which ones are visible.

{{<figure src="https://learnopengl.com/img/getting-started/pipeline.png" caption="Credit: Joey de Vries,https://learnopengl.com/, CC BY 4.0">}}

{{< /horizontal >}}

{{< citations >}}
- [Hello Triangle on learnopengl.com](https://learnopengl.com/Getting-started/Hello-Triangle) 
{{</ citations >}}

---

## Rendering meshes
### Rendering meshes with VTK
{{< notes >}}
VTK offers extensive tools for rendering meshes, allowing for the customization of surface properties and lighting to achieve the desired visualization. This tutorial will guide you through setting up a rendering pipeline in VTK, from loading meshes to final visualization.
{{< /notes >}}

- **VTK rendering features**: Customize surface properties like color, opacity, and lighting. VTK can also handle interactive rendering, where users can rotate and zoom in on the rendered mesh.

{{< tutorial-link link="tutorial-mesh-rendering-vtk" >}}

---

## Rendering meshes
### Rendering meshes with Blender
{{< notes >}}
Blender is a powerful open-source tool for rendering meshes. It supports realistic rendering, including lighting, shadows, transparency, and advanced surface textures. In this tutorial, you will learn how to set up Blender to render scientific datasets as meshes.
{{< /notes >}}

{{< tutorial-link link="tutorial-mesh-rendering-blender" >}}

---

## Rendering meshes
### Cutting volumes in Blender
{{< notes >}}
Blender’s powerful modeling and sculpting tools allow users to cut and manipulate 3D meshes. In this section, we'll cover techniques for cutting volumes to expose internal structures or focus on specific regions. 
- **Cutting meshes**: Use Blender’s **Boolean modifier** to subtract volumes and expose internal structures.
- **Focus on regions**: Cut specific parts of the mesh to highlight or reveal hidden features inside the object.
{{< /notes >}}

{{< tutorial-link link="tutorial-mesh-cutting-volumes-blender" >}}

---

## Choosing colors
{{< notes >}}
Choosing the right colors for your 3D visualizations is crucial for enhancing clarity and understanding. The 
tutorial below guides you through color representation in digital programs, a brief look into existing colormaps, 
and a few more tricks for picking the best colors for your project. 
{{< /notes >}}

- Don't underestimate the impact of choosing colors matching your story!

{{< tutorial-link link="tutorial-choosing-colors" >}}

---

## Ongoing challenges and opportunities
{{< unlisted >}}
{{< notes >}}
In the future, we anticipate several areas of interest for 3D data visualization. These include advancements in web-based rendering tools, higher throughput for processing large datasets, and improvements in automation and dimensionality reduction.
{{< /notes >}}

- Web based viewers
- High Throughput
- Automated workflows
- Dimensionality reduction

### Would you be interested in more specific tutorials?

---
{{< unlisted >}}
{{< notes >}}
Thank you for attending this workshop. Feel free to reach out for further assistance or to explore 
more visualization techniques! 
{{< /notes >}}

{{< horizontal >}}
{{< block >}}
## Thank you!
### Don't hesitate to get in touch:

**support@helmholtz-imaging.de**

**https://connect.helmholtz-imaging.de**

**3D Visualization Workshop** https://events.hifis.net/event/2781/

{{<space>}}{{</space>}}

{{< logos >}}img/logos/desy.png
img/logos/dkfz.png
img/logos/mdc.png{{< /logos >}}

{{< /block >}}

{{< figure src="img/hi-staff.jpg" caption="Helmholtz Imaging Units at DESY, DKFZ, and MDC." >}}

{{< /horizontal >}}