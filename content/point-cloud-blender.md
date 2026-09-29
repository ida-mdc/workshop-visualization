---
title: "Point Clouds in Blender"
date: 2026-09-29
draft: false
layout: workshop
type: page
author: Deborah Schmidt
author_position: Helmholtz Imaging | MDC Berlin
description: Importing a PLY point cloud into Blender and coloring it two ways - by the color the scan already carries, and by a scalar property mapped through a colormap.
cover: img/blender-pointcloud-color.png
background: transparent
---

## Introduction
{{< notes >}}
A point cloud is vertices with no faces between them - nothing for a renderer
to shade. Getting from "a PLY file" to "a picture" takes one extra step
Blender's mesh tools don't need.
{{< /notes >}}

{{< tutorial-link link="mesh-rendering-blender" >}}

---

## Import the PLY

- **File > Import > Stanford PLY** (`wm.ply_import`)
- **Import Colors: sRGB** - carries per-vertex color in as a color attribute
- **Import Attributes** on - any other named per-vertex property comes in too
- Lands as an ordinary mesh: all vertices, zero faces

{{< citations >}}
- Ant point cloud: [Antscan](https://biomedisa.info/antscan/specimen/1031) specimen 1031, *Acromyrmex balzani*, CC BY 4.0 · exported from `point_clouds_tutorial.ipynb`
{{< /citations >}}

---

## From vertices to points

{{< notes >}}
A mesh of bare vertices has no surface, so there is nothing for Cycles to
shade. Geometry Nodes' "Mesh to Points" can build one, but silently drops any
named attribute that isn't explicitly wired through it - the color and the
property both vanish. **Object > Convert To > Point Cloud** does the same job
and keeps every attribute intact.
{{< /notes >}}

- **Object > Convert To > Point Cloud**
- Every point gets its own radius - `point.radius` per point, or one value for all
- Whatever named attributes the PLY carried ride along unchanged

---

## Color from the scan

<div class="hero-overlay">
{{< figure src="img/blender-pointcloud-color.png" caption="Attribute node (Geometry, name 'Col') → Base Color. Whatever color the point carries, straight through." >}}
</div>

---

## Color from a property

<div class="hero-overlay">
{{< figure src="img/blender-pointcloud-property.png" caption="Attribute node (Geometry, name 'dist') → Color Ramp → Base Color. A scalar - distance from the centroid here - through a colormap instead of a lookup." >}}
</div>

{{< notes >}}
Same two nodes as the color material, with a Color Ramp in between - the
difference between "this is the color" and "this number becomes a color."
{{< /notes >}}

---

## Naming, one more time

- Blender's Point Cloud object reserves an attribute literally named **`radius`** for point size
- A property you export under that name silently becomes point size, not color
- This deck's distance-from-centroid property is exported as **`dist`** for exactly that reason

{{< citations >}}
- Ant: [Antscan](https://biomedisa.info/antscan/specimen/1031) specimen 1031, *Acromyrmex balzani*, CC BY 4.0 · Katzke *et al.* (2026), [*High-throughput phenomics of global ant biodiversity*](https://doi.org/10.1038/s41592-026-03005-0), Nat Methods 23, 663–672
{{< /citations >}}
