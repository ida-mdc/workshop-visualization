---
title: "Converting Volumes to Meshes with VTK"
date: 2024-09-09
draft: false
layout: workshop
author: Deborah Schmidt
author_position: Helmholtz Imaging | MDC Berlin
description: This tutorial will guide you through converting 3D pixel datasets, such as labelmaps and masks, into 3D meshes using VTK.
cover: img/volume-to-mesh.jpg
---

## Introduction

{{< notes >}}
In this tutorial, we will use **VTK** to convert 3D volumetric datasets (e.g., labelmaps, masks, and raw data) into 3D meshes. This process is particularly useful for creating surfaces that can be used in 3D visualizations, simulations, or exported to Blender for further processing. You will also learn how to optimize these meshes by decimating and smoothing them.
{{< /notes >}}

---

## Solution to run conversion code automatically

{{< notes >}}
This tutorial will guide you through using a Python based solution for volume to mesh conversion. We will look 
into the details of the code in the following slides.
{{< /notes >}}

{{< solution-in-tutorial catalog="image-challenges" group="visualization" solution="pixel-volumes-to-meshes-vtk" version="0.1.0" >}}

---

## Dependencies

{{< notes >}}
This is the full specification of the virtual environment used for this solution, including the VTK dependency.
{{< /notes >}}

TODO remove parent from solution

{{< highlight highlight="linenos=inline" catalog="image-challenges" group="visualization" 
solution="pixel-volumes-to-meshes-vtk" version="0.1.0" linerange="290-290" >}}

---

## Volume conversion using vtkFlyingEdges3D

{{< notes >}}
We start by converting **TIFF files** into meshes. Labelmaps, which contain multiple labels (e.g., for different tissue types), can be converted into separate meshes for each label. Masks, which are binary, will generate a single mesh along the contour where the dataset values cross a defined threshold.
{{< /notes >}}

{{< highlight highlight="linenos=inline" catalog="image-challenges" group="visualization" 
solution="pixel-volumes-to-meshes-vtk" version="0.1.0" linerange="70-86" >}}

---

## Smoothing

{{< highlight highlight="linenos=inline" catalog="image-challenges" group="visualization" 
solution="pixel-volumes-to-meshes-vtk" version="0.1.0" linerange="89-99" >}}

---


## Decimate geometry

{{< notes >}}
In some cases, the original mesh might be too complex or too detailed for efficient rendering or further processing. Here, we will optimize the meshes by **decimating** and **smoothing** them. Decimation reduces the number of polygons in the mesh, while smoothing makes the surface appear less jagged.
{{< /notes >}}

{{< highlight highlight="linenos=inline" catalog="image-challenges" group="visualization" 
solution="pixel-volumes-to-meshes-vtk" version="0.1.0" linerange="102-108" >}}

---


## Write STL file

TODO in solution, move path before writer

{{< highlight highlight="linenos=inline" catalog="image-challenges" group="visualization" 
solution="pixel-volumes-to-meshes-vtk" version="0.1.0" linerange="126-140" >}}

---

## Conclusion

{{< notes >}}
Converting volumetric data into meshes allows for a wide range of applications in scientific visualization, from exploring internal structures in medical datasets to creating complex 3D models for simulations. The combination of decimation and smoothing helps optimize these meshes for rendering in tools like Blender.
{{< /notes >}}

VTK provides a powerful framework for working with both 3D pixel datasets and meshes, making it easy to transition between volumetric and surface-based representations of your data.

![](img/mesh-simplification.jpg)
