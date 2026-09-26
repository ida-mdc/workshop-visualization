---
title: "Pointcloud Showcase"
date: 2025-09-17
draft: false
type: page
layout: workshop
author: Deborah Schmidt
author_position: Head of Helmholtz Imaging Support Unit, MDC Berlin
cover: img/bessy-beamline-video.png
---

## Point cloud data
### Positions, and nothing joining them

{{< notes >}}
Pull the density down. The surface stops existing - there is no geometry
underneath to fall back on, the way a decimated mesh still has faces.

Now leave the density low and turn the splat size up instead. It looks solid
again, and it carries exactly as little information as before. That is the thing
to be suspicious of in anyone's point cloud figure, including your own: a large
splat radius is how a sparse cloud is made to look dense.
{{< /notes >}}

- **No connectivity** - so a surface has to be *reconstructed* (Poisson, ball pivoting, alpha shapes) if you need one
- **Noisy and redundant** - filter, align between scans, downsample, and normalise intensities before you trust a measurement

{{< scene name="point-cloud" height="420" caption="Density and splat size are independent. Only one of them is data." >}}

---

## Project BESSY2 Reconstruction

{{<horizontal>}}
### Helmholtz Imaging Collaboration with Jan-Simon Schmidt (HZB)

{{<block style="margin-right: 40px">}}
{{<figure src="img/logos/dkfz.png" height="50px" class="image-right">}}
{{<figure src="img/logos/hzb-logo-a4-rgb.jpg" height="80px" class="image-right">}}
{{</block>}}

{{</horizontal>}}
<div style="margin-left: 40px; font-size: 60%">Jan-Simon Schmidt (HZB), Ole Johannsen (DKFZ, Helmholtz Imaging), Deborah Schmidt (MDC, Helmholtz Imaging)</div>

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
### Where the size comes from


{{< notes >}}
A point is 20 to 34 bytes, and a survey holds hundreds of millions of them.

What makes a plain LAS slow is not its size but the absence of a spatial
index: locating the points in one corner means reading all of them.
{{< /notes >}}

- A point is **20 to 34 bytes** - position, intensity, classification, often color and GPS time
- **No connectivity**, so nothing to decimate: the only move is leaving points out
- **No spatial index in LAS/LAZ** - finding the points in a region means reading all of them, which is what the conversion fixes

---

## Large point clouds
### How Potree works

{{< notes >}}
PotreeConverter builds an octree over the cloud and writes three files rather
than millions. Each node holds a sample of the points inside its box.

The viewer walks the octree, ranks nodes by their size on screen, and stops
when the point budget is full.
{{< /notes >}}

{{< scene name="point-lod" height="520" hint="drag to rotate" >}}


- Three files: **`metadata.json`**, **`hierarchy.bin`**, **`octree.bin`** - not millions of small ones
- Served from **any static host** with range requests

{{< citations >}}
- [Potree](https://github.com/potree/potree) · [PotreeConverter](https://github.com/potree/PotreeConverter) · [Schütz (2016), Potree: Rendering Large Point Clouds in Web Browsers, TU Wien](https://www.cg.tuwien.ac.at/research/publications/2016/SCHUETZ-2016-POT/)
{{< /citations >}}

---

## Large point clouds
### Converting and hosting

{{< notes >}}
EPT and Potree's octree are directory trees. COPC packs the same octree into a
single LAZ file read with range requests, which makes it the better choice for
new data.

BESSY II was reconstructed from drone video, cleaned in CloudCompare and
served with Potree.
{{< /notes >}}

{{< horizontal >}}

{{< block >}}
- [**PotreeConverter**](https://github.com/potree/PotreeConverter) - LAS/LAZ in, Potree octree out
- [**Entwine**](https://entwine.io/) - EPT, a directory tree
- [**COPC**](https://copc.io/) - the same octree in one LAZ file, read with range requests. Prefer it for new data
- **CloudCompare** for cleaning, aligning and merging first
{{< /block >}}

{{< figure src="img/bessy-beamline-potree.png" style="max-height: 32vh; width: auto" caption="BESSY II, reconstructed from drone footage and served with Potree" >}}

{{< /horizontal >}}

<div style="font-size: 60%">Jan-Simon Schmidt (HZB), Ole Johannsen (DKFZ, Helmholtz Imaging), Deborah Schmidt (MDC, Helmholtz Imaging)</div>

---
