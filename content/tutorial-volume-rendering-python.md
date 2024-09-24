---
title: "Volumetric Dataset Display Tools"
date: 2024-09-09
draft: false
layout: workshop
author: Deborah Schmidt
author_position: Helmholtz Imaging | MDC Berlin
description: A tutorial on python based tools for visualizing volumetric datasets in 3D, including Napari and Pygfx.
cover: img/volumetric-display-tools.jpg
---

## Introduction

{{< notes >}}
TODO
{{< /notes >}}

TODO

---

## 2.2 Napari: 3D Volume Rendering

{{< notes >}}
**Napari** is a Python-based tool designed for interactive visualization of 2D/3D image data. It supports multi-channel volume rendering, making it a great option for smaller datasets that require quick exploration in 3D. Napari also integrates well with the Python scientific stack, allowing users to run analysis code alongside the visualization.
{{< /notes >}}

### Step-by-Step Guide:
1. **Launch Napari**: Run the solution called **Launch napari v0.4.18**.
2. **Load Data**: Drag and drop the files `raw_channel3.tif` and `labelmap_channel3.tif` into the Napari viewer.
3. **Enable 3D Rendering**: Use the controls at the bottom left to switch to 3D volume rendering. This provides an interactive view of the volumetric data in real-time.

TODO add solution and code

---

## 2.3 Pygfx: Web-Based Visualization

{{< notes >}}
TODO
{{< /notes >}}

{{<citations>}}
- [Pygfx Documentation](https://pygfx.org/)
{{</citations>}}

### Key Features:
TODO

TODO solution and code

{{<citations>}}
- https://docs.pygfx.org/stable/_gallery/index.html#feature-demos
{{</citations>}}

---

## VTK

TODO link to existing tutorial