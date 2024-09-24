---
title: "Volumetric data rendering with Neuroglancer"
date: 2024-09-09
draft: false
layout: workshop
author: Deborah Schmidt
author_position: Helmholtz Imaging | MDC Berlin
description: Use case description of how to render voxel-based volumetric data using Neuroglancer and stream data locally or remotely for visualization.
cover: img/neuroglancer.png
---

## Introduction

{{< notes >}}
**Neuroglancer** is a web-based tool for visualizing large-scale 3D datasets such as brain volumes, microscopy 
images, and annotations. Neuroglancer allows you to stream volumetric datasets for interactive exploration in the browser.

This showcase will demonstrate the process of preparing your data for Neuroglancer, streaming it 
locally or remotely, and working with the Neuroglancer interface to adjust views, add annotations, and share visualizations with collaborators.
{{< /notes >}}

### Main Features:
- **Voxel-based rendering**: Efficiently visualize large 3D datasets by streaming the data directly into the browser.
- **Support for multiple data formats**: Neuroglancer works with a variety of formats like **ZARR** and **OME-ZARR** for volumetric images, as well as annotation formats.
- **Interactive, shareable views**: Customize and share views by copying the URL directly from the Neuroglancer interface.

---

## Available datasets
## Popular datasets using Neuroglancer

{{< notes >}}
Neuroglancer has been used to visualize several large-scale, high-resolution datasets, especially in the fields of neuroscience, biology, and medical imaging. These datasets often involve volumetric scans, such as brain structures, organs, or entire organisms, making Neuroglancer an invaluable tool for researchers who need interactive, 3D visualizations of such complex data.
{{< /notes >}}

- **[MICrONS Explorer](https://www.microns-explorer.org/)**: A large-scale dataset from the **MICrONS Project**, providing high-resolution volumetric reconstructions of a mouse brain.
  
- **[FlyEM Hemibrain](https://www.janelia.org/project-team/flyem/hemibrain)**: This dataset offers a detailed 3D reconstruction of the **Drosophila melanogaster** brain at nanometer resolution.

- **[Human Brain Project](https://www.humanbrainproject.eu/en/)**: Neuroglancer is used to explore vast datasets of human brain scans, providing 3D renderings of brain structures for neuroscience research.

TODO screenshots

---

## Available datasets
## Use case showcased here

{{< notes >}}
TODO
{{< /notes >}}

TODO

---

## Dataset requirements

{{< notes >}}
For Neuroglancer to visualize data, the data must be **available through streams**, either locally or remotely. Neuroglancer streams data on demand, so it’s crucial that data be served via an HTTP or other streaming protocol. Whether data is hosted locally or on a cloud, the tool fetches the portions needed as the user navigates through the 3D space.
{{< /notes >}}

### Supported Data Types
- [Neuroglancer precomputed format](src/datasource/precomputed)
- [N5](src/datasource/n5)
- [Zarr v2/v3](src/datasource/zarr) (including OME-ZARR)
- [Python in-memory volumes](python/README.md) (with automatic mesh generation)
- [BOSS](https://bossdb.org/) , [DVID](https://github.com/janelia-flyem/dvid), [Render](https://github.com/saalfeldlab/render), [Single NIfTI files](https://www.nitrc.org/projects/nifti), [Deep Zoom images](https://github.com/google/neuroglancer/tree/master/src/datasource/deepzoom)

{{<citations>}}
- https://github.com/google/neuroglancer
{{</ citations>}}

---

## Data preparation
### Volumetric images

{{< notes >}}
This section will cover how to prepare volumetric data (like TIFFs representing Z slices) for use in Neuroglancer. We’ll convert the data into **ZARR** format first and then into **OME-ZARR** format for optimal streaming in Neuroglancer.
{{< /notes >}}

### Conversion Steps:
- **Step 1**: Convert the TIFF slices into **ZARR** format, which supports chunked, compressed storage.
- **Step 2**: Convert the **ZARR** files into **OME-ZARR** format, which includes metadata for biological imaging data and supports better integration with visualization tools like Neuroglancer.

TODO link to notebook

---

## Data preparation
### Annotations

{{< notes >}}
In addition to volumetric data, you can also visualize annotations in Neuroglancer. This section will show how to convert a list of 3D points (e.g., cells, features) into **CloudVolume annotations**, which Neuroglancer can render as interactive points in the 3D space.
{{< /notes >}}

### Conversion Steps:
- **Step 1**: Prepare a list of points or annotations that describe features in your dataset (e.g., 3D coordinates for cell locations).
- **Step 2**: Convert the list of points into **CloudVolume annotations**.
- **Step 3**: Stream the annotations alongside your volumetric data in Neuroglancer.

TODO link to notebook

---

## Streaming data locally

{{< notes >}}
For local visualization, you can use a **simple Python server** to serve your data locally to Neuroglancer. This allows you to view your data without hosting it on a remote server. You can use the default Neuroglancer demo page to visualize the data from your local machine.
{{< /notes >}}

### Main Steps:
- **Step 1**: Use Python’s built-in HTTP server to serve the data directory:
  ```bash
  python3 -m http.server
  ```
- **Step 2**: Open the **Neuroglancer demo page** and enter the local URL of your data (e.g., 
  `zarr://http://localhost:8000`).

---

## Neuroglancer interface
### Adding data

{{< notes >}}
The Neuroglancer interface allows users to load multiple datasets, such as volumetric data and annotations. Users can add data by pasting the URL of the dataset (local or remote) and adjust parameters like visibility, color, and opacity.
{{< /notes >}}

### Key Features:
- **Add Data**: Paste the URL of your data and click "Add Layer" to load the data into Neuroglancer.
- **Adjust Layer Properties**: Change the visibility, color, and opacity of each dataset.
- **Layer Management**: Easily add, remove, or re-order layers to customize the visualization.

TODO screenshot

---

## Neuroglancer interface
### Adjust view

{{< notes >}}
Once the data is loaded, you can adjust the view to explore the dataset in detail. This includes zooming, panning, and rotating the 3D volume, as well as slicing through the data to view different cross-sections.
{{< /notes >}}

### Key Features:
- **Zoom and Pan**: Use the mouse to zoom in/out and pan around the dataset.
- **Adjust Slices**: Move through different cross-sections of the data using the scroll wheel or sliders.
- **Rotate 3D Views**: Rotate the volume to inspect different angles and areas of interest.

---

## Sharing views

{{< notes >}}
Neuroglancer makes it easy to share views with collaborators by simply copying the **URL**. The URL encodes the entire view configuration, including which datasets are loaded and how they are visualized. You can also access the **JSON configuration** directly from the interface, which can be useful for scripting and automating views.
{{< /notes >}}

### Example of JSON in URL:
- Copy the URL from your browser, and you’ll notice that it contains encoded parameters for layers, views, and more.
- The **JSON configuration** embedded in the URL can be customized to adjust the view programmatically.

```json
TODO
```

---

## Programmatically generate URL

{{< notes >}}
The **URL** in Neuroglancer can also be generated programmatically, allowing you to automate the setup of a visualization without manually configuring the layers. This is especially useful for generating consistent views across multiple datasets.
{{< /notes >}}

Link to the full notebook showing how to generate a Neuroglancer URL programmatically:

TODO link to notebook

---

## Data hosting for Neuroglancer

{{< notes >}}
There are several options for **hosting data** for Neuroglancer. Data can be hosted locally or on cloud storage (e.g., 
AWS, Google Cloud). Hosting data remotely allows for easier sharing and collaboration.
{{< /notes >}}

- **Local Hosting**: Serve data from your own machine or institution’s servers.
- **AWS S3 or Google Cloud Storage**: Store large datasets and stream them to Neuroglancer from the cloud.
- **Scientific Data Services**: TODO
- **Do you know other hosting places?** Let me know!

---

## Data hosting for Neuroglancer
### Helmholtz storage and viewer

{{< notes >}}
Helmholtz employees have access to **dCache InfiniteSpace** and the **Helmholtz Imaging Neuroglancer instance**, 
which provides a convenient way to host and stream datasets without size limitation.
{{< /notes >}}

- **dCache InfiniteSpace**: Secure, scalable storage solution for Helmholtz researchers to host and stream datasets. 
  The data hosted on the storage can be shared publicly.

**Steps:**

1. Authenticate yourself to access the storage using AAI. TODO link
2. Upload the data, i.e. using `rclone` command line tool or the `Rclone Browser` GUI

{{<citations>}}
- [dCache InfiniteSpace service site](https://helmholtz.cloud/services/?serviceID=9b6c63a4-d26b-4ea6-b8b0-88c0be5ea610)
- [https://hifis-storage.desy.de](https://hifis-storage.desy.de/)
{{</citations>}}

---

## Data hosting for Neuroglancer
### Helmholtz storage and viewer

{{< notes >}}
The **Helmholtz Imaging Neuroglancer instance** can be used to stream data from the **dCache InfiniteSpace** 
directly into the browser. Due to access rights setup of the **dCache InfiniteSpace**, one can't use the default Neuroglancer Demo site 
with that storage.  The **Helmholtz Imaging Neuroglancer instance** is set up with the permission to render data 
from dCache. 
{{< /notes >}}

- **Helmholtz Imaging Neuroglancer instance**: A dedicated Neuroglancer instance for the Helmholtz community.

**Steps:**

1. In https://hifis-storage.desy.de, right click on the dataset you want to stream and click "Get WebDAV link"
2. Replace the `2880` port with `2443`
3. Open https://neuroglancer.helmholtz-imaging.de
4. Add your dataset using the modified URL

