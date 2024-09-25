---
title: "Volumetric data rendering with Neuroglancer"
date: 2024-09-25
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

{{<citations>}}
- [Neuroglancer, Google Connectomics Team](https://github.com/google/neuroglancer)
{{</citations>}}

---

## Available datasets
## Popular datasets using Neuroglancer

{{< notes >}}
Neuroglancer has been used to visualize several large-scale, high-resolution datasets, especially in the fields of neuroscience, biology, and medical imaging. These datasets often involve volumetric scans, such as brain structures, organs, or entire organisms, making Neuroglancer an invaluable tool for researchers who need interactive, 3D visualizations of such complex data.
{{< /notes >}}

{{<horizontal>}}

- **[MICrONS Explorer](https://www.microns-explorer.org/)**: A large-scale dataset from the **MICrONS Project**, providing high-resolution volumetric reconstructions of a mouse brain. 
- **[FlyEM Hemibrain](https://www.janelia.org/project-team/flyem/hemibrain)**: This dataset offers a detailed 3D reconstruction of the **Drosophila melanogaster** brain at nanometer resolution.
- **["H01" Dataset](https://h01-release.storage.googleapis.com/landing)**: 1.4 Petabyte for one cubic millimeter 
    of the human brain, released by the Harvard University and the Connectomics at Google team. 

{{<figure src="img/the-human-brain.png" width="500px" caption="Screenshot from the H01 Dataset ([link](https://h01-dot-neuroglancer-demo.appspot.com/#!%7B%22dimensions%22:%7B%22x%22:%5B8e-9%2C%22m%22%5D%2C%22y%22:%5B8e-9%2C%22m%22%5D%2C%22z%22:%5B3.3e-8%2C%22m%22%5D%7D%2C%22position%22:%5B332552.65625%2C141535.84375%2C3487.12451171875%5D%2C%22crossSectionScale%22:5.776802800212544%2C%22projectionOrientation%22:%5B0.00491650216281414%2C0.035930924117565155%2C-0.03526147082448006%2C0.9987198710441589%5D%2C%22projectionScale%22:261570.24038807175%2C%22layers%22:%5B%7B%22type%22:%22image%22%2C%22source%22:%22precomputed://gs://h01-release/data/20210601/4nm_raw%22%2C%22tab%22:%22source%22%2C%22name%22:%224nm%20EM%22%7D%2C%7B%22type%22:%22segmentation%22%2C%22source%22:%5B%7B%22url%22:%22precomputed://gs://h01-release/data/20210601/c3%22%2C%22subsources%22:%7B%22default%22:true%2C%22bounds%22:true%2C%22properties%22:true%2C%22mesh%22:true%7D%2C%22enableDefaultSubsources%22:false%7D%2C%22precomputed://gs://lichtman-h01-49eee972005c8846803ef58fbd36e049/goog14r0s5c3_new_props/segment_properties%22%5D%2C%22panels%22:%5B%7B%22flex%22:1.55%2C%22tab%22:%22segments%22%7D%5D%2C%22segments%22:%5B%221100054524%22%2C%221115430292%22%2C%2212237931142%22%2C%221333290325%22%2C%221538274151%22%2C%221539076840%22%2C%221594648509%22%2C%221638188509%22%2C%221828951844%22%2C%221915887451%22%2C%221988993337%22%2C%2220070214646%22%2C%222090806103%22%2C%222134549398%22%2C%222178704414%22%2C%222294780853%22%2C%222339328448%22%2C%222499107339%22%2C%222499384877%22%2C%222557789796%22%2C%222673254402%22%2C%2227622860459%22%2C%2227651872764%22%2C%2227870683066%22%2C%222791142865%22%2C%2228000894735%22%2C%2228045909614%22%2C%2228378958224%22%2C%2228409678489%22%2C%2228452985548%22%2C%2228525770719%22%2C%2228643309290%22%2C%2228672203772%22%2C%2228802547903%22%2C%2228803598117%22%2C%2228918216929%22%2C%2229021270843%22%2C%2229182786959%22%2C%2229238417446%22%2C%2229298236361%22%2C%222935896346%22%2C%2229459096371%22%2C%2229618159554%22%2C%2229765396306%22%2C%2229925423252%22%2C%2229938695074%22%2C%2229969547791%22%2C%2230101233972%22%2C%223023633866%22%2C%2230376944711%22%2C%2230406000355%22%2C%223052908678%22%2C%2230668773752%22%2C%2230767987832%22%2C%2230871567933%22%2C%2230974109956%22%2C%2231031989065%22%2C%2231032951251%22%2C%2231061717348%22%2C%2231133932587%22%2C%2231149133165%22%2C%223125564306%22%2C%2231658722916%22%2C%2232444986357%22%2C%223430740099%22%2C%223504577656%22%2C%223518943222%22%2C%223573728110%22%2C%2236123853342%22%2C%2236153829678%22%2C%2236241229806%22%2C%2236284756264%22%2C%2236445761568%22%2C%2236590837294%22%2C%2236619747807%22%2C%2236620463168%22%2C%2236633005581%22%2C%223664545249%22%2C%2236662790455%22%2C%2236678107375%22%2C%2236763714196%22%2C%2236809473223%22%2C%2236822073774%22%2C%2236822262086%22%2C%2236852896228%22%2C%2237173591638%22%2C%2237218168369%22%2C%2237318668413%22%2C%2237319791473%22%2C%2237420743412%22%2C%2237421824682%22%2C%2237463700916%22%2C%2237536734693%22%2C%2237581252436%22%2C%2237594612366%22%2C%2237668755920%22%2C%2237770758892%22%2C%2237801070911%22%2C%2237930756265%22%2C%2237958718097%22%2C%2238018479939%22%2C%2238092682277%22%2C%2238106873604%22%2C%2238208029710%22%2C%2238222309348%22%2C%2238339219897%22%2C%2238368158152%22%2C%2238383402139%22%2C%223839697992%22%2C%2238413115427%22%2C%2238543488421%22%2C%2238573083867%22%2C%2238586823171%22%2C%2238602358951%22%2C%2238717924646%22%2C%2238863556782%22%2C%2238863862489%22%2C%223897678996%22%2C%2238994907574%22%2C%2239023934118%22%2C%2239038491013%22%2C%2239052800624%22%2C%2239081564265%22%2C%2239271712983%22%2C%2239271916939%22%2C%2239359991385%22%2C%223941569746%22%2C%2239505037109%22%2C%2239694250521%22%2C%2240043667040%22%2C%2240102203154%22%2C%2240247497000%22%2C%2240378483178%22%2C%2240407875435%22%2C%2240464862282%22%2C%2241354296446%22%2C%2241630488832%22%2C%224217863883%22%2C%224318903980%22%2C%2245701832369%22%2C%224580553370%22%2C%224698412002%22%2C%224784821941%22%2C%2248079386659%22%2C%224917456198%22%2C%224961186471%22%2C%225062824784%22%2C%225499847526%22%2C%2258866575372%22%2C%2259536235974%22%2C%225965326176%22%2C%226024781859%22%2C%22664433854%22%2C%22707068981%22%2C%22794630620%22%2C%22823395680%22%2C%22853035674%22%2C%22910562342%22%5D%2C%22segmentQuery%22:%22#interneuron%20#L2%20NSe%3E=800%20%3CNSi%22%2C%22colorSeed%22:4270253886%2C%22name%22:%22c3%20segmentation%22%7D%2C%7B%22type%22:%22segmentation%22%2C%22source%22:%22precomputed://gs://h01-release/data/20210601/layers%22%2C%22tab%22:%22source%22%2C%22selectedAlpha%22:0.3%2C%22objectAlpha%22:0.2%2C%22segments%22:%5B%221%22%2C%222%22%2C%223%22%2C%224%22%2C%225%22%2C%226%22%2C%227%22%5D%2C%22segmentQuery%22:%221%2C2%2C3%2C4%2C5%2C6%2C7%22%2C%22name%22:%22cortical%20layers%22%2C%22visible%22:false%7D%5D%2C%22showSlices%22:false%2C%22prefetch%22:false%2C%22selectedLayer%22:%7B%22row%22:1%2C%22flex%22:1.55%2C%22size%22:309%2C%22layer%22:%224nm%20EM%22%7D%2C%22layout%22:%7B%22type%22:%22xy-3d%22%2C%22orthographicProjection%22:true%7D%2C%22selection%22:%7B%22row%22:2%2C%22flex%22:0.45%2C%22size%22:309%2C%22visible%22:false%7D%7D))">}}

{{</horizontal>}}

---

## Available datasets
### Helmholtz Imaging collaboration use case

{{< notes >}}
In collaboration with Prof. Dr. Mathias Treier from MDC Berlin, the Helmholtz Imaging Support team is utilizing 
Neuroglancer to visualize mice brains with different genetic mutations and corresponding brain regions. 
{{< /notes >}}

{{<center>}}

{{<figure src="img/neuroglancer-treier3.png" height="600px">}}

{{</center>}}

{{<citations>}}
- [Mathias Treier, MDC Berlin](https://www.mdc-berlin.de/de/person/prof-dr-mathias-treier)
{{</citations>}}

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

{{<horizontal>}}
{{<block>}}

### Conversion Steps:
- **Step 1**: Convert the TIFF slices into **ZARR** format, which supports chunked, compressed storage.
- **Step 2**: Convert the **ZARR** files into **OME-ZARR** format, which includes metadata for biological imaging data and supports better integration with visualization tools like Neuroglancer.

{{<center>}}
[**Notebook: TIFF slices to multiscale OME-ZARR**](https://gitlab.com/ida-mdc/24-treier/-/blob/main/Convert%20TIFF%20slices%20to%20OME-ZARR.ipynb?ref_type=heads)

{{</center>}}
{{</block>}}

{{<figure src="img/neuroglancer-treier.png">}}

{{</horizontal>}}


---

## Data preparation
### Annotations

{{< notes >}}
In addition to volumetric data, you can also visualize annotations in Neuroglancer. This section will show how to convert a list of 3D points (e.g., cells, features) into **CloudVolume annotations**, which Neuroglancer can render as interactive points in the 3D space.
{{< /notes >}}

{{<horizontal>}}
{{<block>}}

### Conversion Steps:
- **Step 1**: Prepare a list of points or annotations that describe features in your dataset (e.g., 3D coordinates for cell locations).
- **Step 2**: Convert the list of points into **CloudVolume annotations**.

{{<center>}}
[**Notebook: JSON point locations to Neuroglancer Precomputed annotations**](https://gitlab.com/ida-mdc/24-treier/-/blob/main/Convert%20cells%20to%20precomputed.ipynb?ref_type=heads)

{{</center>}}
{{</block>}}

{{<figure src="img/neuroglancer-treier2.png">}}

{{</horizontal>}}

---

## Streaming data locally

{{< notes >}}
For local visualization, you can use a **simple Python server** to serve your data locally to Neuroglancer. This allows you to view your data without hosting it on a remote server. You can use the default Neuroglancer demo page to visualize the data from your local machine.
{{< /notes >}}

### With Python:
- **Step 1**: Use Python’s built-in HTTP server to serve the data directory:
  ```bash
  python3 -m http.server
  ```
- **Step 2**: Open the **Neuroglancer demo page** and enter the local URL of your data (e.g., 
  `zarr://http://localhost:8000/my-dataset.ome.zarr`).

---

## Sharing views

{{< notes >}}
Neuroglancer makes it easy to share views with collaborators by simply copying the **URL**. The URL encodes the entire view configuration, including which datasets are loaded and how they are visualized. You can also access the **JSON configuration** directly from the interface, which can be useful for scripting and automating views.
{{< /notes >}}

### Example of JSON in URL:
- Copy the URL from your browser, and you’ll notice that it contains encoded parameters for layers, views, and more.
- The **JSON configuration** embedded in the URL can be customized to adjust the view programmatically.

```json
{
  "dimensions": {...},
  "position": [
    3744.089599609375,
    4562.4326171875,
    837.0703125
  ],
  "layers": [
    {
      "type": "image",
      "source": "zarr://https://hifis-storage.desy.de:2443/Helmholtz/HIP/collaborations/2405_MDC_Treier/public/G5111-S4/647nm_cFOS",
      "tab": "rendering",
      "shaderControls": {
        "normalized": {
          "range": [
            0,
            500
          ]
        }
      },
      "crossSectionRenderScale": 0.47742080195520836,
      "name": "cFOS"
    }
    {
      "type": "annotation",
      "source": "precomputed://https://hifis-storage.desy.de:2443/Helmholtz/HIP/collaborations/2405_MDC_Treier/public/G5111-S4/cells",
      "tab": "source",
      "name": "Cells"
    }
  ],
  "selectedLayer": {
    "visible": true,
    "layer": "cFOS"
  }
}
```

---

## Programmatically generate URL

{{< notes >}}
The **URL** in Neuroglancer can also be generated programmatically, allowing you to automate the setup of a visualization without manually configuring the layers. This is especially useful for generating consistent views across multiple datasets.
{{< /notes >}}

Link to the full notebook showing how to generate a Neuroglancer URL programmatically:


{{<center>}}
[**Notebook: Generate Neuroglancer URLs**](https://gitlab.com/ida-mdc/24-treier/-/blob/main/Generate%20Neuroglancer%20URLs.ipynb?ref_type=heads)
{{</center>}}

---

## Data hosting for Neuroglancer

{{< notes >}}
There are several options for **hosting data** for Neuroglancer. Data can be hosted locally or on cloud storage (e.g., 
AWS, Google Cloud). Hosting data remotely allows for easier sharing and collaboration.
{{< /notes >}}

- **Local Hosting**: Serve data from your own machine or institution’s servers.
- **AWS S3 or Google Cloud Storage**: Store large datasets and stream them to Neuroglancer from the cloud.
- **Scientific Data Services**: e.g. [BioImage Archive](https://www.ebi.ac.uk/bioimage-archive/)
- **Do you know other compatible hosting places?** Let us know!

---

## Data hosting for Neuroglancer
### Helmholtz storage compatible to Neuroglancer


**Collaboration between Helmholtz Imaging and HIFIS at DESY, with the support of the Jülich Cluster.**

{{<horizontal>}}

{{<space>}}{{</space>}}
{{<figure src="img/logos/HIFIS_Logo_short_RGB_cropped.svg" height="60px" class="image-right">}}
{{<figure src="img/logos/Logo_des_Forschungszentrums_Jülich_seit_2018.svg" height="70px" class="image-right">}}

{{</horizontal>}}

{{< notes >}}

Helmholtz employees have access to **dCache InfiniteSpace** and the **Helmholtz Imaging Neuroglancer instance**, 
which provides a convenient way to host and stream datasets without size limitation.
{{< /notes >}}

- **dCache / InfiniteSpace**: Secure, scalable storage solution for Helmholtz researchers to host and stream datasets. 
  The data hosted on the storage can be shared publicly.

**Steps:**

1. Authenticate yourself to access the storage using AAI.
2. Upload the data, i.e. using `rclone` command line tool or the `Rclone Browser` GUI


{{<citations>}}
- [HIFIS dCache documentation](https://hifis.net/doc/cloud-services/Storage_DESY/)
- [https://hifis-storage.desy.de](https://hifis-storage.desy.de/)
{{</citations>}}

---

## Data hosting for Neuroglancer
### Helmholtz Neuroglancer Instance

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

