---
title: "Rendering in the browser"
date: 2024-09-25
draft: true
layout: workshop
type: page
author: Deborah Schmidt
author_position: Helmholtz Imaging | MDC Berlin
description: What can be rendered in a browser today, which tool fits which data, and a worked case of streaming a volume with Neuroglancer.
cover: img/the-human-brain.png
---

## Why the browser at all

{{< notes >}}
The browser has quietly become one of the better places to put scientific 3D
data, for one reason that has nothing to do with graphics: **a URL reaches
everybody**. No install, no version, no operating system, no "which release of
the plugin are you on". For anything you want a collaborator, a reviewer or a
reader to actually look at, that is decisive.

What made it possible technically is WebGL2 - and increasingly WebGPU - giving
a page real GPU access, plus chunked cloud formats like OME-Zarr that can be
read a piece at a time over HTTP. Those two together mean a browser can stream
a terabyte the same way it streams a map: fetch the tiles you are looking at,
at the resolution you need.

The limits are real and worth stating. GPU memory is whatever the machine has
and you cannot ask for more. There is no filesystem, so the data has to be
served from somewhere with CORS set correctly. And the format decides
everything: put a 200 GB TIFF on a web server and no browser tool will help
you.
{{< /notes >}}

- **A URL reaches everyone** - no install, no versions, no platform
- **WebGL2 and WebGPU** give a page real GPU access
- **Chunked formats** (OME-Zarr, EPT, COPC) let it fetch only what is on screen
- **But**: the data must be served with CORS, and in a chunked format to begin with

---

## What renders in a browser today
### Volumes and images

{{< notes >}}
An overview, because this field moved fast and most people's mental map is a
few years old.

**Neuroglancer** is the one we use below: Google's WebGL viewer, built for
connectomics, extremely good at enormous volumes with segmentations and
annotations, and it encodes the whole view state in the URL.

**webKnossos** is the other heavyweight - a full annotation platform rather
than just a viewer, strong on collaborative skeleton and volume annotation.

**Viv** is a library rather than an application, for multiplexed and highly
multichannel imaging; **Avivator** is the drop-in viewer that demonstrates it,
and **Vitessce** builds on Viv to put imaging and single-cell data side by side.

**itk-vtk-viewer** and **VolView** both come from Kitware and both run vtk.js
in the page - VolView leans towards clinical DICOM work and does cinematic
volume rendering.

**NiiVue** is the neuroimaging one: small, fast, WebGL2, reads NIfTI and friends,
and embeds in a page in a few lines.
{{< /notes >}}

| Tool | Best at | Reads |
|---|---|---|
| **Neuroglancer** | huge volumes with segmentations and annotations; shareable URLs | Zarr / OME-Zarr, N5, precomputed |
| **webKnossos** | collaborative annotation at scale, not just viewing | Zarr, WKW, N5 |
| **Viv** / **Avivator** | highly multiplexed 2D and 3D microscopy | OME-Zarr, OME-TIFF |
| **Vitessce** | imaging plus single-cell data in one view | OME-Zarr, AnnData |
| **itk-vtk-viewer** | images, meshes and point sets together | many, via itk-wasm |
| **VolView** | clinical volumes, cinematic rendering | DICOM, NIfTI |
| **NiiVue** | neuroimaging, easy to embed | NIfTI, DICOM, MGH |
| **MoBIE** (web) | sharing multi-modal projects from the BDV world | OME-Zarr, N5 |

{{< citations >}}
- [Neuroglancer](https://github.com/google/neuroglancer) · [webKnossos](https://webknossos.org) · [Viv](https://github.com/hms-dbmi/viv) · [Vitessce](https://vitessce.io) · [itk-vtk-viewer](https://kitware.github.io/itk-vtk-viewer/docs/) · [VolView](https://kitware.github.io/VolView/) · [NiiVue](https://github.com/niivue/niivue)
{{< /citations >}}

---

## What renders in a browser today
### Meshes, point clouds and scenes

{{< notes >}}
The other half of the landscape, and the half people forget exists.

For **point clouds**, Potree is still the reference: it reads Entwine point
tiles, streams billions of points, and it is what the BESSY II reconstruction
in this workshop is served with. COPC is the newer single-file alternative to
EPT and is worth preferring for new data.

For **meshes**, glTF is the format to export to - it is the JPEG of 3D, and
`<model-viewer>` puts one on a page in a single HTML tag. Smithsonian Voyager
is the polished end of this: annotations, tours, measurement, built for
museums.

For **anything custom**, three.js is the library underneath most of the above -
including every illustration in these slides. Deck.gl is the one to reach for
when the data is geospatial.
{{< /notes >}}

| Tool | Best at | Reads |
|---|---|---|
| **Potree** | streaming very large point clouds | EPT, LAS/LAZ |
| **COPC viewers** | same, from a single cloud-optimised file | COPC |
| **CesiumJS** / **deck.gl** | geospatial point clouds, tiles and terrain | 3D Tiles, LAS |
| **`<model-viewer>`** | one mesh on a page, in one HTML tag | glTF / GLB |
| **Smithsonian Voyager** | annotated, guided object presentation | glTF |
| **three.js** / **Babylon.js** | anything custom, including these slides | glTF, OBJ, PLY |

{{< citations >}}
- [Potree](https://github.com/potree/potree) · [COPC](https://copc.io) · [deck.gl](https://deck.gl) · [model-viewer](https://modelviewer.dev) · [Voyager](https://smithsonian.github.io/dpo-voyager/) · [three.js](https://threejs.org)
{{< /citations >}}

---

## What renders in a browser today
### Choosing one

{{< notes >}}
The honest decision rule, which is shorter than the tables.

Start from the data. If it is a big volume with segmentations, Neuroglancer. If
people need to annotate it together, webKnossos. If it is highly multiplexed
microscopy, Viv. If it is a point cloud, Potree or COPC. If it is one mesh you
want people to look at, glTF and model-viewer - and you are done in an
afternoon.

Then check the format, because that is what actually blocks you. Every tool in
these tables wants chunked, multi-resolution data served over HTTP with CORS
enabled. Converting to OME-Zarr or EPT is the work; picking the viewer is the
easy part.
{{< /notes >}}

- **Big volume + segmentation** → Neuroglancer
- **Needs collaborative annotation** → webKnossos
- **Multiplexed microscopy** → Viv / Avivator
- **Point cloud** → Potree, or COPC for new data
- **One mesh, for anyone** → glTF + `<model-viewer>`
- **Something bespoke** → three.js

{{< center >}}
In every case: the conversion is the work, the viewer is the easy part.
{{< /center >}}

---

## Neuroglancer, in detail

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

## Neuroglancer, in detail
### Popular datasets

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

## Neuroglancer, in detail
### Helmholtz Imaging collaboration use case

{{< notes >}}
In collaboration with Prof. Dr. Mathias Treier from MDC Berlin, the Helmholtz Imaging Support team is utilizing 
Neuroglancer to visualize mice brains with different genetic mutations and corresponding brain regions. 
{{< /notes >}}

{{<center>}}

{{<figure src="img/neuroglancer-treier3.png" width="1000">}}

{{</center>}}

{{<citations>}}
- [Mathias Treier, MDC Berlin](https://www.mdc-berlin.de/de/person/prof-dr-mathias-treier)
{{</citations>}}

---

## Neuroglancer, in detail
### Dataset requirements

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

## Hosting the data

{{< notes >}}
There are several options for **hosting data** for Neuroglancer. Data can be hosted locally or on cloud storage (e.g., 
AWS, Google Cloud). Hosting data remotely allows for easier sharing and collaboration.
{{< /notes >}}

- **Local Hosting**: Serve data from your own machine or institution’s servers.
- **AWS S3 or Google Cloud Storage**: Store large datasets and stream them to Neuroglancer from the cloud.
- **Scientific Data Services**: e.g. [BioImage Archive](https://www.ebi.ac.uk/bioimage-archive/)
- **Do you know other compatible hosting places?** Let us know!

---

## Hosting the data
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

## Hosting the data
### Streaming from your own machine

{{< notes >}}
Moved here from the voxels session, where it sat among the volume rendering
slides and had nothing to do with volume rendering.

You do not need a server to try any of this. A few lines of Python serve a
directory over HTTP with the CORS headers a browser viewer insists on, which
is enough for Neuroglancer or the NGFF validator to read a dataset straight
off your laptop.
{{< /notes >}}

1. Open a terminal and activate the [workshop environment](https://github.com/ida-mdc/workshop-visualization/tree/main/visualization_software)
2. Download [`server.py`](https://github.com/ida-mdc/workshop-visualization/tree/main/example_data/server.py) somewhere convenient
3. Change into the directory holding your data: `cd workshop`
4. Run it: `python server.py`
5. In the **Neuroglancer demo page**, give it the local URL, e.g.
   `zarr://http://localhost:8000/my-dataset.ome.zarr`

---

## Hosting the data
### Checking what you are serving

{{< notes >}}
Once the data is reachable over HTTP, the same URL can go to a validator. Most
"the viewer shows nothing" problems are metadata problems, and this says so in
one page rather than after twenty minutes of guessing.
{{< /notes >}}

1. Open [the OME-NGFF validator](https://ome.github.io/ome-ngff-validator/)
2. Either open one of their example URLs, or
3. append your own data URL to it:
   `https://ome.github.io/ome-ngff-validator/?source=http://0.0.0.0:8080/my-dataset.ome.zarr`
