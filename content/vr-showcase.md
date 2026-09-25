---
title: "VR Showcase"
date: 2026-09-25
draft: false
type: page
layout: workshop
author: Thomas Roßberg
author_position: Research Software Engineer @ Helmholtz Imaging, MDC Berlin
description: How to look at volumetric data on a VR headset.
cover: img/bg.jpg
---

## Displaying your data in 3D

- 3D data? Why not watch it in 3D with a VR headset?!
- ... you borrow one and try to set it up for hours ...
- And notice: it's not straightforward to get working :/

---

## Background and general info

- depth perception through: stereo view + motion parallax
- good hardware/GPU needed: 2 eyes/displays with many pixels (2 x 2160 × 2160px = 8M px/frame) and high, consistent
  framerate (72-144Hz) to avoid VR-sickness
- typical: Render frames on computer (better GPU), stream (compressed) frames/video to VR headset
- streaming: cable or Wifi, but both require high bandwidth
- Windows support okay, Linux support worse

---

## Tools

| Tool                                                                       | Notes                                                                            | Windows | Linux  | View | Annotate |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------- | ------ | ---- | -------- |
| Blender + VR Scene Inspector                                               | works well                                                                       | x       | x      | x    | -        |
| + [Microscopy Nodes](https://aafkegros.github.io/MicroscopyNodes/overview/) | to load volumetric data (tiff/zarr), but big volumes not fast on full resolution | x       | x      | x    | -        |
| [syGlass](https://www.syglass.io/)                                         | commercial, but works okay                                                       | x       | -      | x    | x        |
| [sciview](https://github.com/scenerygraphics/sciview) (Fiji plugin)        | not polished, controller support missing -> WASD/keyboard needed                 | x       | maybe? | x    | -        |

untested:

- ParaView
- 3D Slicer with [SlicerVirtualReality](https://github.com/KitwareMedical/SlicerVirtualReality) add-on
- [arivis VisionVR](https://www.arivis.com/arivis-news/arivisvisionvr36): commercial, allows editing

{{< citations >}}
- [Taking ParaView into Virtual Reality (Kitware)](https://www.kitware.com/taking-paraview-into-virtual-reality/)
- [ParaView User's Guide: Virtual Reality](https://docs.paraview.org/en/latest/UsersGuide/displayingData.html#virtual-reality)
{{</ citations >}}

---

## Linux support

- badly supported, confusing, badly documented
- for Quest 3: no official support
- [WiVRn](https://github.com/WiVRn/WiVRn), [ALVR](https://github.com/alvr-org/alvr): stream frames from PC to VR over Wifi
- wired connection requires developer mode/account :/

---

## Option running in Quest Browser

- maybe possible, but untested
- mobile GPU -> limited compute
- VTK.js or three.js officially support it

---

## Testing

- try it yourself today
