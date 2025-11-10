---
title: "3D Data Visualization Workshop"
date: 2025-09-17
draft: false
type: page
layout: workshop
author: Deborah Schmidt
author_position: Head of Helmholtz Imaging Support Unit, MDC Berlin
description: In this workshop, we highlight various approaches and methodologies for visualizing 3D datasets. 
cover: img/bg.jpg
---

## Project BESSY2 Reconstruction

{{<horizontal>}}
### Helmholtz Imaging Collaboration

{{<block style="margin-right: 40px">}}
{{<figure src="img/logos/dkfz.png" height="50px" class="image-right">}}
{{<figure src="img/logos/hzb-logo-a4-rgb.jpg" height="80px" class="image-right">}}
{{</block>}}

{{</horizontal>}}
<div style="margin-left: 40px; font-size: 60%">Jan-Simon Schmidt (HZB), Ole Johannsen (DKFZ, Helmholtz Imaging), Deborah Schmidt (MDC, Helmholtz Imaging)</div>

{{< notes >}}
Experiments in BESSY II change regularly, making tracking those changes - e.g. for planning additional experiments - necessary. Common surveying techniques are laborious and offer unneeded accuracy. Thus, we provide a pragmatic solution where the status quo is reconstructed from drone video footage. The resulting 3D reconstruction can be rendered from above using orthogonal projection. Overlaying this rendering with the original 2D plans gives valuable information about the differences between the status quo and the theoretical plans.
{{< /notes >}}

{{<figure src="img/bessy2-top.jpg">}}

---

## Project BESSY2 Reconstruction
### Workflow & Tools

* Extract point clouds from frames of drone video footage
* **Clean & rotate, and merge point clouds** (using *CloudCompare*)
* **Render results in Blender** for inspection & visualization
* **Convert to Potree format** (multi resolution)
* **Upload to public server** → Accessible in browser with **Potree** (open-source WebGL based point cloud renderer for large point clouds)
