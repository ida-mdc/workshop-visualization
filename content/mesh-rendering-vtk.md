---
title: "Rendering meshes in VTK"
date: 2024-09-25
draft: false
layout: workshop
author: Deborah Schmidt
author_position: Helmholtz Imaging | MDC Berlin
description: Learn how to render 3D meshes in VTK and get insights into the Python code behind it.
cover: img/vtk-meshes.png
---

## Introduction

{{< notes >}}
**VTK** is a powerful toolkit for rendering 3D meshes, and this tutorial focuses on using the provided solution for rendering scientific 3D datasets. We will explore not just how to run the solution, but also how the underlying Python code works, step by step. You will learn the foundational concepts of VTK while also understanding how to extend the code for your own datasets.
{{< /notes >}}

{{<horizontal>}}

- Python based 3D visualization tool
- Supports various formats (STL, OBJ, PLY, ..)
- Advanced rendering capabilities (volume rendering, surface rendering, light and material configuration)
- Supports programmatic animations

{{<figure src="img/vtk-rendering-slicing.png">}}

{{</horizontal>}}

{{<citations>}}
- [Schroeder, Will; Martin, Ken; Lorensen, Bill (2006), The Visualization Toolkit (4th ed.), Kitware, ISBN 978-1-930934-19-1](http://en.wikipedia.org/wiki/Special:BookSources/978-1-930934-19-1), https://vtk.org/
{{</citations>}}

---

## Solution to run VTK code

{{< notes >}}
This tutorial will guide you through using Album's **visualize-meshes-vtk** solution, showcasing how you can interact with 3D meshes and volume data using VTK, all while running it in an isolated environment.
{{< /notes >}}

{{< solution-in-tutorial catalog="image-challenges" group="visualization" solution="visualize-meshes-vtk" version="0.1.0" >}}

---

## Dependencies

{{< notes >}}
This is the full specification of the virtual environment used for this solution, including the VTK dependency.
{{< /notes >}}


{{< highlight highlight="linenos=inline,hl_lines=9" catalog="image-challenges" group="visualization" solution="visualize-meshes-vtk" version="0.1.0" linerange="316-332" >}}

---

## Setting the scene

{{< notes >}}
Let's dive into the code. The **renderer** in VTK is responsible for managing the objects and actors in the scene 
and handling how the data will be visualized. The renderer adds objects to the scene, processes lighting, and manages the camera view, ultimately controlling what appears in the rendered image.
{{< /notes >}}

- **The renderer**: Manages the **3D scene** by adding objects (called actors), processing lighting, and handling the camera to control how the scene is displayed.
- **Central component in VTK**: The renderer is responsible for **compositing all elements** (meshes, volumes, etc.) and rendering them into a final image or interactive display.

{{< highlight highlight="linenos=inline,hl_lines=9" catalog="image-challenges" group="visualization" solution="visualize-meshes-vtk" version="0.1.0" linerange="97-97" >}}

---

## Loading and Adding Meshes

{{< notes >}}
Next, let's look at the Python code responsible for **loading STL meshes**. The solution reads multiple mesh files 
from a specified folder and adds them as actors to the scene.
{{< /notes >}}

- **Load STL files** via `vtkSTLReader`
- **Coloring Meshes** via `actor.GetProperty().SetColor()`

{{< highlight highlight="linenos=inline" catalog="image-challenges" group="visualization" solution="visualize-meshes-vtk" version="0.1.0" linerange="119-132" >}}

---

## Loading and Adding Voxel Volumes
### Numpy to VTK Conversion

{{< notes >}}
In this section, we convert volumetric data (such as TIFF files) into a format that VTK can render. This is done by transforming **NumPy arrays** into VTK-compatible data structures.
{{< /notes >}}

{{< highlight highlight="linenos=inline" catalog="image-challenges" group="visualization" solution="visualize-meshes-vtk" version="0.1.0" linerange="45-61" >}}

---

## Loading and Adding Voxel Volumes
### Color and Opacity Transfer Functions

{{< notes >}}
This section handles the application of **color and opacity** transfer functions, which define how the volume is rendered based on the underlying voxel values. These functions control how data values are mapped to specific colors and levels of transparency.
{{< /notes >}}

{{< highlight highlight="linenos=inline" catalog="image-challenges" group="visualization" solution="visualize-meshes-vtk" version="0.1.0" linerange="63-74" >}}

---

## Loading and Adding Voxel Volumes
### Creating a Volume Node

{{< notes >}}
Once the volumetric data has been prepared and the transfer functions defined, a **volume node** is created to represent the volumetric data in the 3D scene. This is what gets rendered by VTK's pipeline.
{{< /notes >}}

{{< highlight highlight="linenos=inline" catalog="image-challenges" group="visualization" solution="visualize-meshes-vtk" version="0.1.0" linerange="76-80" >}}

---

## Creating the Render Window

{{< notes >}}
The **render window** is where the final rendering of the meshes and volumes occurs. It controls how the scene is displayed, and can output either to the screen for interactive visualization or to a video file for post-processing.
{{< /notes >}}

- **Render Window**: Manages the actual window where the scene is displayed.
- **RenderWindowInteractor**: Allows for interactive control of the 3D scene using mouse and keyboard inputs.

{{< highlight highlight="linenos=inline,hl_lines=9" catalog="image-challenges" group="visualization" solution="visualize-meshes-vtk" version="0.1.0" linerange="33-41" >}}

---

## Result

{{< notes >}}
In this tutorial, we explored how to render 3D meshes and voxel volumes in VTK, step by step. VTK offers a wide range of features for visualizing scientific data in 3D, from applying advanced material properties to handling complex volumetric datasets. As you continue working with VTK, explore its many additional features, including streamlines for flow visualization, annotations, and 3D text labels for enhancing your visualizations.
{{< /notes >}}

{{<center>}}
{{<figure src="img/vtk-mesh-volume.png" caption="Meshes and volume in one view." width="800px">}}
{{</center>}}

{{<citations>}}
- [VTK Documentation](https://vtk.org/documentation/)
- [VTK Python Examples and Tutorials](https://examples.vtk.org/site/Python)
- [Album Framework](https://album.solutions)
{{</citations>}}

