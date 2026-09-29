---
title: "Vector Field Visualization"
date: 2026-09-29
draft: false
layout: workshop
type: page
author: Ella Bahry
author_position: Helmholtz Imaging | MDC Berlin
description: "A tour of vector field visualization techniques - glyphs, streamlines and their relatives, scalar derivations, and line integral convolution - built from a schematic Van Allen belt model, a synthetic tornado, and other teaching datasets."
cover: img/vector-field/title-tractography.jpg
---

## Vector Field Visualization

{{< figure src="img/vector-field/title-tractography.jpg" style="max-height: 55vh; width: auto" >}}

---

## NASA's Perpetual Ocean

{{< notes >}}
Perpetual Ocean 2, NASA Scientific Visualization Studio - dense streaklines over a real ocean-current model.
{{< /notes >}}

{{< youtube id="R5-s6O8qyvE" height="60vh" caption="Perpetual Ocean 2 - NASA Scientific Visualization Studio" >}}

---

## A Vector Field, Rendered as Fur

{{< notes >}}
A wind field as line integral convolution, styled to look like fur - the same
LIC technique this deck ends on, just with a stylised colormap.
{{< /notes >}}

{{< youtube id="zFpamnNEyBw" height="60vh" caption="YouTube channel: But Why Me?" >}}

---

## Each Point in Space
### Has a Vector Value - Direction and Magnitude

{{< horizontal >}}

{{< figure src="img/vector-field/cartoon-vector-value.png" style="max-height: 40vh; width: auto" >}}

{{< block >}}
A **scalar field** has one number per point.

A **vector field** has a direction and a magnitude at every point - wind, blood flow, a magnetic field, an ocean current.
{{< /block >}}

{{< /horizontal >}}

{{< horizontal >}}

{{< figure src="img/vector-field/point-grid.png" caption="A point cloud" style="max-height: 30vh; width: auto" >}}

{{< figure src="img/vector-field/point-vector-field.png" caption="The same points, with a vector attached to each" style="max-height: 30vh; width: auto" >}}

{{< /horizontal >}}

---

## Our Goal: A Tailored Visualization
### Van Allen Belt Simulation

{{< notes >}}
|B| is the magnetic-field magnitude at each location. B_eq is one chosen
reference magnitude: the undisturbed field at Earth's equatorial surface.
|B|/B_eq is therefore the normalized, dimensionless magnitude.

Panel 1 and 3 are common naive approaches - a uniform Cartesian grid of
glyphs, and an exhaustively seeded plane of streamlines. Panel 2 removes
sampling and magnitude bias; panel 4 seeds only at magnetically meaningful
L-shells. Drag any panel to rotate all four together - the cameras are
linked, exactly as in the notebook.
{{< /notes >}}

{{< pyvista src="pyvista/van-allen-belts.html" height="62vh" caption="Interactive - the same figure the notebook renders, exported from PyVista straight to vtk.js. Drag to rotate, scroll to zoom; all four panels share one camera." >}}

- Full notebook: [vector_field_visualization.ipynb](https://github.com/ida-mdc/workshop-visualization/blob/main/notebooks/vector_field_visualization.ipynb)

---

## Visualization Types
### Glyphs, Streamlines, Ribbons, Isolines

{{< figure src="img/vector-field/visualization-types-overview.png" style="max-height: 60vh; width: auto" >}}

---

## Vector Field as Scalar
### Usually as a Heatmap

{{< notes >}}
Tornado simulation: wind velocity is a vector field, but wind-speed
*magnitude* is a scalar derived from it - so it can be shown as an ordinary
heatmap, on one plane, two planes, or (with opacity) in the full volume.
{{< /notes >}}

Visualize any scalar derived from a vector field:

- **Magnitude**
- Vorticity
- Curvature

{{< horizontal >}}

{{< figure src="img/vector-field/tornado-streamlines.png" caption="The underlying 3D wind vector field" style="max-height: 34vh; width: auto" >}}

{{< figure src="img/vector-field/tornado-slices.png" caption="Magnitude on one horizontal, one vertical slice" style="max-height: 34vh; width: auto" >}}

{{< figure src="img/vector-field/tornado-two-planes.png" caption="Magnitude on two orthogonal planes" style="max-height: 34vh; width: auto" >}}

{{< /horizontal >}}

Visualize **1 plane** &middot; **2 planes** (here orthogonal) &middot; **3D with opacity**...

---

## Vector Field as Glyphs
### Blood Flow Simulation

{{< figure src="img/vector-field/bloodflow-opening.png" style="max-height: 26vh; width: auto" >}}

{{< horizontal >}}

{{< figure src="img/vector-field/bloodflow-lines.png" caption="Lines - show orientation, but not flow direction" style="max-height: 30vh; width: auto" >}}

{{< figure src="img/vector-field/bloodflow-arrows.png" caption="Arrows - arrowheads make direction explicit" style="max-height: 30vh; width: auto" >}}

{{< /horizontal >}}

{{< horizontal >}}

{{< figure src="img/vector-field/bloodflow-dense.png" caption="Too dense - scaled glyphs + dense sampling" style="max-height: 30vh; width: auto" >}}

{{< figure src="img/vector-field/bloodflow-pulsatile.gif" caption="3D + time - pulsatile flow through one heartbeat" style="max-height: 30vh; width: auto" >}}

{{< /horizontal >}}

---

## Vector Field as Streamlines
### Yield Smooth and Continuous Curves

{{< notes >}}
Streamlines require a seed per line - intelligent seed placement is vital.
Too many and the figure is unreadable (dense); too few and structure is
lost (sparse). Depth and time are two more dimensions a 2D streamline plot
can still carry, through color and through motion.
{{< /notes >}}

{{< horizontal >}}

{{< figure src="img/vector-field/ocean-dense.png" caption="Dense" style="max-height: 30vh; width: auto" >}}

{{< figure src="img/vector-field/ocean-sparse.png" caption="Sparse" style="max-height: 30vh; width: auto" >}}

{{< /horizontal >}}

{{< horizontal >}}

{{< figure src="img/vector-field/ocean-depth.png" caption="Depth - four layers, darker blue is deeper" style="max-height: 30vh; width: auto" >}}

{{< figure src="img/vector-field/ocean-time.gif" caption="Time - tracer particles moving along the network" style="max-height: 30vh; width: auto" >}}

{{< /horizontal >}}

{{< citations >}}
- Illustrative Gulf-Stream-style model inspired by NASA's *Perpetual Ocean*; not scientific ocean-model output
{{< /citations >}}

---

## Streamlines, and More
### Stationary vs. Over Time

{{< horizontal >}}

{{< figure src="img/vector-field/wake-streamlines.png" caption="Streamlines - snapshot of flow direction" style="max-height: 30vh; width: auto" >}}

{{< figure src="img/vector-field/wake-streamtubes.png" caption="Streamtubes - bundles of streamlines" style="max-height: 30vh; width: auto" >}}

{{< /horizontal >}}

{{< horizontal >}}

{{< figure src="img/vector-field/wake-pathlines.png" caption="Pathlines - particle trajectory over time" style="max-height: 30vh; width: auto" >}}

{{< figure src="img/vector-field/wake-streaklines.png" caption="Streaklines - dye injection trail over time" style="max-height: 30vh; width: auto" >}}

{{< /horizontal >}}

- **Stationary**: streamlines, streamtubes &middot; **Over time**: pathlines, streaklines

{{< citations >}}
- Synthetic aircraft-wake model: forward flow, counter-rotating wingtip vortices, a time-varying gust
{{< /citations >}}

---

## Vector Field as LIC
### Line Integral Convolution

{{< notes >}}
Goal: a global view of a steady vector field, avoiding clutter and seeds.
Method: start with an image of noise, smear it along the vector field -
this requires structured data.
{{< /notes >}}

{{< horizontal >}}

{{< figure src="img/vector-field/lic-grayscale.png" caption="Flow past a cylinder" style="max-height: 32vh; width: auto" >}}

{{< figure src="img/vector-field/lic-magnitude.png" caption="Color e.g. magnitude" style="max-height: 32vh; width: auto" >}}

{{< figure src="img/vector-field/lic-torus.png" caption="Surface overlay" style="max-height: 32vh; width: auto" >}}

{{< /horizontal >}}

{{< figure src="img/vector-field/lic-schematic.png" caption="Noise, smeared along the field, is the whole method" style="max-height: 20vh; width: auto" >}}

{{< citations >}}
- LIC schematic: Weiskopf / Machiraju / Möller
{{< /citations >}}

---

## Usually You Want a Combo
### There Are So Many Ways of Representing the Same Data

{{< notes >}}
Find the one that makes it pop.
{{< /notes >}}

{{< horizontal >}}

{{< figure src="img/vector-field/tornado-combo.png" caption="Glyphs + volume, tornado" style="max-height: 40vh; width: auto" >}}

{{< figure src="img/vector-field/cyclone-combo.gif" caption="Streamlines + LIC + volume, tropical cyclone" style="max-height: 40vh; width: auto" >}}

{{< /horizontal >}}

---

## Before You Visualize: Ask Yourself
### What Shape Is Your Data?

- List what needs to be visualized, and think of the best combo of visualizations
  - Will it look best as 2D, 3D, or 4D?
    - e.g. show time as animation or a time slider (or e.g. stream paths)

### How to Deal With Clutter and Occlusion?

- **Color** - e.g. separate depth by hue, not position
- **Sparsity** - fewer, well-chosen samples
- **Clipping** - cut the mesh open
- **Opacity** - make the obstruction see-through

---

## Tool Comparison

| Tool | Interactive Visualization? | Scriptable / Reproducible | Rendering Quality | Learning Curve |
|---|---|---|---|---|
| PyVista / VTK | Yes | Yes (Python) | Good | Medium |
| ParaView | Yes | Yes (Python) | Good | Medium-High |
| MATLAB | Limited | Yes | Basic-decent | Low-Medium |
| Blender | Yes | Yes (Python) | Excellent | High |

---

## Try It Out
### Jupyter Notebook

```bash
uv venv .venv_vector_field --python 3.12 --seed
uv pip install --python .venv_vector_field -r visualization_software/requirements_vector_field.txt
uv run --python .venv_vector_field jupyter lab
```

- [vector_field_visualization.ipynb](https://github.com/ida-mdc/workshop-visualization/blob/main/notebooks/vector_field_visualization.ipynb) - every figure in this deck, live and interactive
