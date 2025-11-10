---
title: "Volume rendering of Voxel based data"
date: 2024-09-25
draft: false
layout: workshop
type: page
author: Deborah Schmidt
author_position: Helmholtz Imaging | MDC Berlin
description: Learn how to render voxel-based volumetric data using BigDataViewer (BDV) and tools built on top of BDV. 
cover: img/bvv-magic.png
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

## Visualizing Voxel Data interactively with napari
{{< notes >}}
With the rise of popularity of Python as a script and programming language in the life sciences and beyond, let's 
look at Python based volumetric rendering in the tutorial linked below. We will start with Napari and later also look into VTK.
{{< /notes >}}

1. Install and activate environment ([guide](https://github.com/ida-mdc/workshop-visualization/tree/main/visualization_software))
2. Download Notebook [voxel_rendering_napari.ipynb](https://github.com/ida-mdc/workshop-visualization/tree/main/notebooks/voxel_rendering_napari.ipynb) into workshop directory 
3. Type `jupyter lab` and press `Enter`
4. Open Notebook from list of files on the left side
5. Run Cells in the Notebooks one by one by pressing `Shift` and `Enter`

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

## Rendering with VTK including Transfer Function adjustment
{{< notes >}}
VTK is a great tool for experimenting with visualizing a 3D data set using transfer functions. You can try it out with the following notebook.
{{< /notes >}}

1. Install and activate environment ([guide](https://github.com/ida-mdc/workshop-visualization/tree/main/visualization_software))
2. Download Notebook [voxel_rendering_vtk.ipynb](https://github.com/ida-mdc/workshop-visualization/tree/main/notebooks/voxel_rendering_vtk.ipynb) into workshop directory 
3. Type `jupyter lab` and press `Enter`
4. Open Notebook from list of files on the left side
5. Run Cells in the Notebooks one by one by pressing `Shift` and `Enter`

---

## Big Data Rendering
### How can images be loaded partially and on demand?

{{< horizontal >}}

{{< block >}}

- Image stored in chunks as files on disk
- Image stored in different resolutions
- Open Microscopy Environment specification format (OME-NGFF)

{{< /block >}}

{{<figure src="img/resolution-pyramid.png" width="600">}}

{{< /horizontal >}}

---

## Big Data Rendering
### BigDataViewer Ecosystem
{{< notes >}}
Fiji is still choice number one for many who want to inspect an image quickly, mainly because it supports a vast 
number of data formats. While Fiji can already render 3D data with its built in 3D Viewer, it also comes with 
BigDataViewer (BDV), a great tool for arbitrary slicing of 3D data of any size. A whole ecosystem of tools based on BDV 
has evolved over time, which we will explore in the tutorial linked below.
{{< /notes >}}

- **Supports large data formats**: The BDV ecosystem can handle massive 3D datasets and allow arbitrary slicing.

{{< tutorial-link link="1-4_volume-rendering-bdv" >}}

---

## Big Data Rendering
## Streaming data locally

{{< notes >}}
For local visualization, you can use a **simple Python server** to serve your data locally to visualization tools which support streaming. This allows you to view your data without hosting it on a remote server. 
{{< /notes >}}

### With Python:
- **Step 1**: Open your terminal and activate the [workshop environment](https://github.com/ida-mdc/workshop-visualization/tree/main/visualization_software)
- **Step 2**: Download [this script](https://github.com/ida-mdc/workshop-visualization/tree/main/example_data/server.py) somewhere convenient.
- **Step 3**: Navigate to your data: `cd workshop`
- **Step 4**: Run the script: `python server.py`
- **Step 2**: Open the **Neuroglancer demo page** and enter the local URL of your data (e.g., 
  `zarr://http://localhost:8000/my-dataset.ome.zarr`).

---

## Big Data Rendering
### Providing data 
{{< notes >}}
If we share data via web protocol, e.g. HTTP, we can use web tools such as the OME NGFF Validator to inspect the metadata and format of our OME ZARRs.  
{{< /notes >}}

1. Open https://ome.github.io/ome-ngff-validator/
2. Either open one of their example URLs, or..
3. .. attach your data URL to the validator URL: https://ome.github.io/ome-ngff-validator/?source=http://0.0.0.0:8080/my-dataset.ome.zarr 

---

## Visualizing volumetric datasets
### Web based rendering with Neuroglancer
{{< notes >}}
A web-based 3D viewer allows for interactive visualization directly in the browser without needing specialized software. These viewers can be embedded into web pages or shared with collaborators. 
The following tutorial does not come with a full overview of existing web based viewers, but offers insight into a 
project we are working on at MDC where we utilize Neuroglancer to display large scale mice brains online. 
{{< /notes >}}

- **Collaboration-friendly**: Share URLs with collaborators to provide access to the 3D visualization.

{{< tutorial-link link="1-5_volume-rendering-neuroglancer" >}}
