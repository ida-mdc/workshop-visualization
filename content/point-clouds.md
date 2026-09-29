---
title: "Pointcloud Showcase"
date: 2026-09-29
draft: false
type: page
layout: workshop
author: Deborah Schmidt
author_position: Head of Helmholtz Imaging Support Unit, MDC Berlin
cover: img/bessy-beamline-video.png
---

## Point cloud data
### Example notebook

1. **Color by the scan's own color**
2. **Color by a property**
3. **Estimate normals**
4. **Color by normal direction**
5. Save PLY, with colors and normals attached

[point_clouds_tutorial.ipynb](https://github.com/ida-mdc/workshop-visualization/blob/main/notebooks/point_clouds_tutorial.ipynb)

---

## Point cloud data
### Getting that PLY into Blender

{{< tutorial-link link="point-cloud-blender" >}}

---

## Project BESSY2 Reconstruction

{{<horizontal>}}
### Helmholtz Imaging Collaboration with Jan-Simon Schmidt (HZB)

{{<block style="margin-right: 40px">}}
{{<figure src="img/logos/dkfz.png" height="50px" class="image-right">}}
{{<figure src="img/logos/hzb-logo-a4-rgb.jpg" height="80px" class="image-right">}}
{{</block>}}

{{</horizontal>}}
<div style="margin-left: 40px; font-size: 60%">Jan-Simon Schmidt (HZB), Ole Johannsen (DKFZ, now MDC, Helmholtz Imaging), Deborah Schmidt (MDC, Helmholtz Imaging)</div>

{{< notes >}}
Experiments in BESSY II change regularly, making tracking those changes - e.g. for planning additional experiments - necessary. Common surveying techniques are laborious and offer unneeded accuracy. Thus, we provide a pragmatic solution where the status quo is reconstructed from drone video footage. The resulting 3D reconstruction can be rendered from above using orthogonal projection. Overlaying this rendering with the original 2D plans gives valuable information about the differences between the status quo and the theoretical plans.
{{< /notes >}}

{{<figure src="img/bessy2-top.jpg" style="max-height: 29vh; width: auto">}}

---

## Project BESSY2 Reconstruction
### Workflow & Tools

* Extract point clouds from frames of drone video footage
* **Clean & rotate, and merge point clouds** (using *CloudCompare*)
* **Render results in Blender** for inspection & visualization
* **Integrate room layout** by converting SVG file to Mesh & import it in Blender
* **Convert to Potree format** (multi resolution)
* **Upload to public server** → Accessible in browser with **Potree** (open-source WebGL based point cloud renderer for large point clouds)

---

{{< cover src="img/bessy-beamline-video.png" background="black" color="white" title="Blender fly-through" >}}

{{< /cover >}}

---

{{< cover src="img/bessy-beamline-floorplan.png" background="white" color="black" title="Floor plan" >}}

{{< /cover >}}

---

{{< cover src="img/bessy-beamline-floor-render.png" background="black" color="white" title="Blender floor" >}}

{{< /cover >}}


---

{{< cover src="img/bessy-beamline-potree.png" background="black" color="white" title="Potree / Entwine-generated EPT format" >}}

{{< /cover >}}


---

## Large point clouds
### Do it yourself: convert and visualize in Potree

**PLY → LAS → EPT octree**

{{< horizontal >}}

{{< block >}}
**With Docker**

```bash
docker run --rm -v "$PWD:/data" pdal/pdal \
  pdal translate /data/cloud.ply /data/cloud.las

docker run --rm -v "$PWD:/data" connormanning/entwine \
  build -i /data/cloud.las -o /data/ept --threads 8
```
{{< /block >}}

{{< block >}}
**With micromamba**

```bash
micromamba create -n entwine -c conda-forge entwine pdal
micromamba activate entwine

entwine pdal translate cloud.ply cloud.las

entwine build -i cloud.las -o ept --threads 8
```
{{< /block >}}

{{< /horizontal >}}

{{< citations >}}
- [PDAL](https://pdal.io/) · [Entwine](https://entwine.io/)
{{< /citations >}}

---

## Large point clouds
### Do it yourself: host and open

```bash
# 3 · serve the directory containing ept/, with CORS
python example_data/server.py -d . -p 8123
```

**Open it in the Helmholtz Imaging Potree instance**

```
https://ida-mdc.gitlab.io/potree-launcher/?dataUrl=http://127.0.0.1:8123/ept/ept.json
```

- The launcher takes any `dataUrl`: EPT `ept.json`, Potree `cloud.js` / `metadata.json`, or a COPC `.laz`
- `server.py` sends required CORS headers

{{< citations >}}
- [Potree launcher](https://ida-mdc.gitlab.io/potree-launcher/) · [`server.py`](https://github.com/ida-mdc/workshop-visualization/tree/main/example_data/server.py)
{{< /citations >}}