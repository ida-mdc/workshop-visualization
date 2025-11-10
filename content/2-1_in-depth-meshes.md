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
