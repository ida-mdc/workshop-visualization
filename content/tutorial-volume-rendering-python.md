---
title: "Volumetric Dataset Rendering in Python"
date: 2024-09-25
draft: false
layout: workshop
author: Deborah Schmidt
author_position: Helmholtz Imaging | MDC Berlin
description: A tutorial on python based tools for visualizing volumetric datasets in 3D, including napari, Pygfx, and VTK.
cover: img/napari.png
---

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

## Volume Rendering in napari
### Solution to run napari code through Album

{{< notes >}}
You can follow the [official instructions](https://napari.org/stable/tutorials/fundamentals/installation.html) to 
install napari. Alternatively, use this Album solution to run the code / launch napari directly either from command 
line or graphical user interface.
{{< /notes >}}

{{< solution-in-tutorial catalog="image-challenges" group="visualization" solution="launch-napari" version="0.2.0" >}}

---

## Volume Rendering in napari
### Dependencies

{{< notes >}}
This is the full specification of the virtual environment used for this solution, including the napari dependency.

Note that we are installing napari via pip, even though it is available via conda as well. The conda package was 
unfortunately for some reason interfering with other virtual environments.
{{< /notes >}}


{{< highlight highlight="linenos=inline,hl_lines=9" catalog="image-challenges" group="visualization" 
solution="launch-napari" version="0.2.0"  linerange="58-67">}}

---

## Volume Rendering in napari
### Running napari programmatically

{{< notes >}}
Here is the source code for how to launch napari programmatically:
{{< /notes >}}

{{< highlight highlight="linenos=inline" catalog="image-challenges" group="visualization" 
solution="launch-napari" version="0.2.0"  linerange="8-24">}}

{{<citations>}}
- [napari tutorials](https://napari.org/stable/tutorials/)
{{</citations>}}

---

## Volume Rendering with Pygfx

{{< notes >}}
**Pygfx** is a modern 3D rendering library for Python, designed for GPU-accelerated volumetric 
visualization.
{{< /notes >}}

### Key Features:
- **Real-time GPU Rendering**: Leverages modern GPU acceleration for high-performance 2D and 3D graphics.
- **Diverse application support**: from scientific visualization to video game rendering.
- **Flexible Scene Graph**: Employs a scene graph architecture to efficiently manage complex scenes.
- **Custom Shader Support**: Allows for custom shaders to create advanced visual effects.

{{<citations>}}
- [Pygfx Documentation](https://pygfx.org/)
{{</citations>}}

---

## Volume Rendering with Pygfx
### Solution to run pygfx code through Album

{{< notes >}}
You can write your own scripts to run pygfx. Alternatively, use this Album solution to render a volume in pygfx 
directly either from command line or graphical user interface.
{{< /notes >}}

{{< solution-in-tutorial catalog="image-challenges" group="visualization" solution="render-volume-pygfx" version="0.1.0" >}}

---

## Volume Rendering with Pygfx
### Dependencies

{{< notes >}}
This is the full specification of the virtual environment used for this solution, including the pygfx dependency.
{{< /notes >}}

{{< highlight highlight="linenos=inline,hl_lines=5" catalog="image-challenges" group="visualization" 
solution="render-volume-pygfx" version="0.1.0"  linerange="88-95">}}

---

## Volume Rendering with Pygfx
### Setting the scene

{{< notes >}}
Unlike napari, Pygfx deals with 3D scenes rather than single-image viewers. This allows for more complex visualizations involving multiple objects, interactive cameras, and customized environments.
{{< /notes >}}

{{< highlight highlight="linenos=inline,hl_lines=5" catalog="image-challenges" group="visualization" 
solution="render-volume-pygfx" version="0.1.0"  linerange="18-21">}}

---

## Volume Rendering with Pygfx
### Adding the volume to the scene

{{< notes >}}
Once the scene is set, the next step is to load the volume and apply rendering techniques. Depending on user input, Pygfx allows for either **isosurface rendering** (extracting a surface based on intensity values) or **raycasting** (rendering through the volume). The choice of strategy depends on whether you are interested in internal or surface features.
{{< /notes >}}

{{< highlight highlight="linenos=inline,hl_lines=5" catalog="image-challenges" group="visualization" 
solution="render-volume-pygfx" version="0.1.0"  linerange="23-41">}}

---

## Volume Rendering with Pygfx
### Setting up the camera and running the application

{{< notes >}}
To enable interactive 3D rendering, Pygfx uses an **orbit controller** to manipulate the camera. This controller allows users to rotate around the scene, zoom in and out, and view the volume from different angles.
{{< /notes >}}

{{< highlight highlight="linenos=inline,hl_lines=5" catalog="image-challenges" group="visualization" 
solution="render-volume-pygfx" version="0.1.0"  linerange="40-55">}}

{{<citations>}}
- [Pygfx Demos](https://docs.pygfx.org/stable/_gallery/index.html#feature-demos)
{{</citations>}}

---

## Volume Rendering in VTK

{{< notes >}}
**VTK** is another powerful tool for volumetric rendering, known for its flexibility and advanced customization options. One of VTK’s strengths is its ability to define and manipulate **transfer functions** programmatically, enabling precise control over how voxel data is mapped to color and opacity. For users who need a graphical interface, there are tools like ParaView and 3D Slicer built on top of VTK, providing easier access to these features.
{{< /notes >}}

- **Transfer Functions**: Map voxel intensities to color and opacity for flexible and accurate rendering.
- **Advanced customization**: Full control over lighting, shading, and rendering parameters.
- **ParaView & 3D Slicer**: GUI-based tools built on VTK for easier interaction with volumetric data.

{{< tutorial-link link="tutorial-mesh-rendering-vtk" >}}
