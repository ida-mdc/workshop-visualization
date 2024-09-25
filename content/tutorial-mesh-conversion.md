---
title: "Converting Volumes to Meshes with VTK"
date: 2024-09-09
draft: false
layout: workshop
author: Deborah Schmidt
author_position: Helmholtz Imaging | MDC Berlin
description: This tutorial will guide you through converting 3D pixel datasets, such as labelmaps and masks, into 3D meshes using VTK.
cover: img/vtk-rendering.png
---

## Introduction

{{< notes >}}
In this tutorial, we will use **VTK** to convert 3D volumetric datasets (e.g., labelmaps, masks, and raw data) into 3D meshes. This process is particularly useful for creating surfaces that can be used in 3D visualizations, simulations, or exported to Blender for further processing. You will also learn how to optimize these meshes by decimating and smoothing them.
{{< /notes >}}

- **VTK** provides robust tools for generating meshes from volumes, including labelmaps and raw pixel data.
- **FlyingEdges3D** is a highly efficient algorithm for generating iso-surfaces from volumetric data.
- VTK supports advanced options for mesh optimization, including **smoothing** and **decimation**.

{{<citations>}}
- [Schroeder, Will; Martin, Ken; Lorensen, Bill (2006), The Visualization Toolkit (4th ed.), Kitware, ISBN 978-1-930934-19-1](http://en.wikipedia.org/wiki/Special:BookSources/978-1-930934-19-1), https://vtk.org/
{{</citations>}}

---

## Solution to run conversion code automatically

{{< notes >}}
This tutorial will guide you through using a Python based solution for volume to mesh conversion. We will look 
into the details of the code in the following slides.
{{< /notes >}}

{{< solution-in-tutorial catalog="image-challenges" group="visualization" solution="pixel-volumes-to-meshes-vtk" version="0.2.0" >}}

---

## Dependencies

{{< notes >}}
This is the full specification of the virtual environment used for this solution, including the VTK dependency.
{{< /notes >}}

{{< highlight highlight="linenos=inline" catalog="image-challenges" group="visualization" 
solution="pixel-volumes-to-meshes-vtk" version="0.2.0"  linerange="314-329">}}

---

## Volume conversion using vtkFlyingEdges3D

{{< notes >}}
We start by converting **TIFF files** into meshes. Labelmaps, which contain multiple labels (e.g., for different tissue types), can be converted into separate meshes for each label. Masks, which are binary, will generate a single mesh along the contour where the dataset values cross a defined threshold.
{{< /notes >}}

- Add zero border around dataset
- Load volumetric image using `vtkImageData`
- Generate meshes using `vtkFlyingEdges3D` algorithm
- Set threshold between foreground and background via `GenerateValues (int numContours, double rangeStart, double 
  rangeEnd)`

{{< highlight highlight="linenos=inline" catalog="image-challenges" group="visualization" 
solution="pixel-volumes-to-meshes-vtk" version="0.2.0" linerange="72-100" >}}

{{<citations>}}
- [VTK Documentation: vtkFlyingEdges3D](https://vtk.org/doc/nightly/html/classvtkFlyingEdges3D.html#details)
{{</citations>}}

---

## Smoothing

{{< notes >}}
In some cases, the original mesh might be too complex or too detailed for efficient rendering or further processing. 
Smoothing makes the surface appear less jagged.
{{< /notes >}}

- **Number of iterations**: Controls how many smoothing passes are applied.
- **Feature Edge Smoothing**: Ensures that important edges are preserved while smoothing.
- **Boundary Smoothing**: Smooths out the mesh along the boundaries. 

{{< highlight highlight="linenos=inline" catalog="image-challenges" group="visualization" 
solution="pixel-volumes-to-meshes-vtk" version="0.2.0" linerange="103-114" >}}

{{<figure src="img/vtk-smoothing.png">}}

{{<citations>}}
- [VTK Documentation: vtkWindowedSincPolyDataFilter](https://vtk.org/doc/nightly/html/classvtkWindowedSincPolyDataFilter.html#details)
{{</citations>}}

---

## Decimate geometry

{{< notes >}}
In some cases, the original mesh might be too complex or too detailed for efficient rendering or further processing. 
Here, we will optimize the meshes by **decimating** them. Decimation reduces the number of polygons in the mesh.
{{< /notes >}}

- **Target Reduction**: Defines the percentage reduction in the number of polygons (e.g., 0.5 for 50% reduction).
- **Preserve Topology**: Ensures that the overall shape and connectivity of the mesh are maintained during decimation.

{{< highlight highlight="linenos=inline" catalog="image-challenges" group="visualization" 
solution="pixel-volumes-to-meshes-vtk" version="0.2.0" linerange="117-125" >}}

{{<figure src="img/vtk-mesh-reduction.png">}}

{{<citations>}}
- [VTK Documentation: vtkDecimatePro](https://vtk.org/doc/nightly/html/classvtkDecimatePro.html#details)
{{</citations>}}

---


## Write STL file

The final step in this process is to write the generated mesh to an STL file. STL files are widely used for 3D printing, simulations, and visualizations in tools like Blender.

{{< highlight highlight="linenos=inline" catalog="image-challenges" group="visualization" 
solution="pixel-volumes-to-meshes-vtk" version="0.2.0" linerange="155-160" >}}

