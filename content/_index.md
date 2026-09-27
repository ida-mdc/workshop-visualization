---
title: "3D Data Visualization Workshop @ HIDA, September 2026"
date: 2026-09-24
draft: false
type: page
layout: workshop
cover: img/bg.jpg
---

# Workshop 3D Data Rendering
With the Helmholtz Imaging Support Unit @ MDC Berlin

## Monday
- 12pm Installation time
- 1pm Lunch
- 2pm **Introduction, general remarks, overview of 3D Data rendering**
  - [Introduction slides]({{< ref "introduction.md" >}})
  - [3D Data Visualization - an overview]({{< ref "overview.md" >}})
  - [Example data](https://github.com/ida-mdc/workshop-visualization/tree/main/example_data)
- 2:45pm **Image Quality Control**
- 3:45pm Coffee
- 4:15pm **Volumetric Data Rendering**
  - [Overview Slides]({{< ref "voxels.md" >}})
    - Notebook: [voxel_rendering_vtk.ipynb](https://github.com/ida-mdc/workshop-visualization/blob/main/notebooks/voxel_rendering_vtk.ipynb) - transfer functions by hand ([requirements](https://github.com/ida-mdc/workshop-visualization/blob/main/visualization_software/requirements_volumetric.txt))
    - Notebook: [voxel_rendering_pygfx.ipynb](https://github.com/ida-mdc/workshop-visualization/blob/main/notebooks/voxel_rendering_pygfx.ipynb) - the same volume on the GPU through wgpu ([requirements](https://github.com/ida-mdc/workshop-visualization/blob/main/visualization_software/requirements_volumetric.txt))
  - [Large 3D data]({{< ref "large-data.md" >}})
    - Notebook: [tiff_to_ngff_and_neuroglancer.ipynb](https://github.com/ida-mdc/workshop-visualization/blob/main/notebooks/tiff_to_ngff_and_neuroglancer.ipynb) - TIFF to OME-Zarr, and into Neuroglancer ([requirements](https://github.com/ida-mdc/workshop-visualization/blob/main/visualization_software/requirements_ngff.txt))
    - Notebook: [luxar_gaussian_splats.ipynb](https://github.com/ida-mdc/workshop-visualization/blob/main/notebooks/luxar_gaussian_splats.ipynb) - needs a CUDA GPU, and installs its own toolchain

## Tuesday
- 10am **Meshes** - 60min follow-along
  - Overview Slides
  - Notebook: voxel_to_mesh.ipynb - the conversion, in nine steps
  - Notebook: mesh_rendering_tutorial.ipynb - rendering meshes from a script
  - [Basic mesh rendering in Blender]({{< ref "mesh-rendering-blender.md" >}})
  - [Mesh cutting in Blender]({{< ref "mesh-cutting-blender.md" >}})
- 11:00am Blender & Microscopy Nodes demo
- 12:00am **Getting To Know Your Data** with [Jochen Müller](https://jochen-mueller.net/) (Stiftung Planetarium Berlin)
- 1pm Lunch
- 2pm **Colors**
  - [Choosing Colors]({{< ref "colors.md" >}})
- 2:15pm **Point Clouds Demo**
  - Slides
  - Notebook: point_clouds_tutorial.ipynb - clean, estimate normals, reconstruct
- 2:30pm **Vector Fields**
  - [Slides](https://docs.google.com/presentation/d/1-1JZgfX_mI7O-hc0a87jiUeIkjSDVrHvkAye3upBfI8/edit?usp=sharing)
  - Notebook: [vector_field_visualization.ipynb](https://github.com/ida-mdc/workshop-visualization/blob/main/notebooks/vector_field_visualization.ipynb) - the figures behind those slides ([requirements](https://github.com/ida-mdc/workshop-visualization/blob/main/visualization_software/requirements_vector_field.txt))
- 3pm Open Working Time


## Wednesday
- 9am Open Working Time
- 1:30pm Lunch
- 3pm [Encounters in the Milkyway](https://www.planetarium.berlin/veranstaltungen/encounters-milky-way), Zeiss Planetarium Berlin

## Thursday
- 10am **VR Showcase**
  - [Slides]({{< ref "vr-showcase.md" >}})
- 10:30am Open Working Time
- 1pm Lunch
- 3pm **Presentation & Feedback**
- 5pm End of workshop

