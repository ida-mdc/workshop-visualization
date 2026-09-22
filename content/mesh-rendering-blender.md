---
title: "Rendering in Blender"
date: 2024-09-25
draft: false
layout: workshop
author: Deborah Schmidt
description: In this section, we will cover specific Blender features to help you create beautiful renderings from scientific datasets. Blender is a powerful tool for this purpose, but it has a steep learning curve, so we’ll break it down step-by-step.
cover: img/blender-render-result.png
background: transparent
---

## Create a New Blender Scene

{{< notes >}}
To start, launch Blender and create a new scene to begin setting up your rendering environment. You can save this scene and reload it later with the same solution, preserving your work.
{{< /notes >}}

- **Install Blender** from the official website: https://www.blender.org/download/
- **Launch Blender** and create a new scene.

{{<citations>}}
- [Blender Online Community. Blender - a 3D modelling and rendering package, Stichting Blender Foundation, Amsterdam.](https://www.blender.org)
{{</citations>}}

---

## General Usage
### Import Mesh Files

{{< notes >}}
Blender allows you to import meshes, such as **STL files**, from previous steps in the workflow. These might need to be resized or adjusted for Blender's scale.
{{< /notes >}}

{{< horizontal >}}

- Go to `File > Import > STL (.stl)`
- Imported objects might be scaled too large or small. To adjust, go to the **Layout** tab, select the object, and press `n` to open the options for scaling.

{{< figure src="img/blender-import-stl.png" class="center">}}

{{< /horizontal >}}

---

## General Usage
### Toggle Quad View

{{< notes >}}
The quad view gives you orthogonal views (top, side, and front) simultaneously, which is useful for positioning objects accurately.
{{< /notes >}}

- To enable **Quad View**, go to **View > Area > Toggle Quad View**

{{< figure src="img/blender-quad-view.png" class="center">}}

---

## General Usage
### View from the Camera

{{< notes >}}
To see what the camera is capturing, you can switch to the camera view and adjust the perspective for rendering.
{{< /notes >}}

- Go to **View > Viewpoint > Camera** for switching to camera view
- Go to **View > Align View > Align Active Camera to View** for adjusting the camera to the current view

{{< figure src="img/blender-align-camera.png" class="center">}}

{{<citations>}}
- [Blender Documentation: Cameras](https://docs.blender.org/manual/en/latest/render/cameras.html#cameras)
{{</citations>}}

---

## Performance
### Set View Parameters

{{< notes >}}
Adjusting viewport shading and view parameters can improve performance or give you a clearer preview of your rendering, depending on your hardware.
{{< /notes >}}

{{< horizontal >}}

- Use the **Viewport Shading** buttons in the top right corner to change shading modes:
- **Rendered mode** for full previews.
- **Material preview mode** for a balance between performance and detail.

{{< figure src="img/blender-viewports.png">}}

{{< /horizontal >}}

{{<citations>}}
- [Blender Documentation: Viewport Shading](https://docs.blender.org/manual/en/latest/editors/3dview/display/shading.html)
{{</citations>}}

---

## Performance
### Adjust GPU Settings

{{< notes >}}
Blender relies heavily on your system’s GPU for rendering. Ensuring your GPU is properly configured will improve performance and the quality of your renderings.
{{< /notes >}}

{{< horizontal >}}

- Blender requires a GPU with at least **2GB of VRAM**.
- To configure your GPU, go to `Edit > Preferences... > System > Cycles Render Devices`
- Ensure that **GPU Compute** is selected under `Cycles` as the **Render Engine**.

{{< figure src="img/blender-gpu-settings.png">}}

{{< /horizontal >}}

{{<citations>}}
- [Blender Documentation: GPU Rendering](https://docs.blender.org/manual/en/latest/render/cycles/gpu_rendering.html)
{{</citations>}}

---

## Performance
### Adjust Render Parameters

{{< notes >}}
Tweaking render parameters can improve the visual quality of your render, especially when working with reflective or translucent materials such as glass.
{{< /notes >}}

{{< horizontal >}}

{{< figure src="img/blender-render-settings.png">}}


- In the **Rendering tab**, under `Render Properties`, increase values in the **Light Paths** section with glass or 
  glossy materials, or decrease these values to improve performance.
- In **Output Properties**, Adjust the resolution percentage for fast preview renderings or detailed print renderings.

{{< /horizontal >}}

{{<citations>}}
- [Blender Documentation: Rendering](https://docs.blender.org/manual/en/latest/render/index.html)
{{</citations>}}

---

## Object appearance
### Smooth Shading for Objects

{{< notes >}}
Smoothing the shading of objects can make your mesh appear less blocky and more polished, especially for organic shapes.
{{< /notes >}}

- Right-click the object and select **Shade Smooth** to apply smooth shading.

{{< figure src="img/blender-shade-smooth.png" class="center">}}

{{<citations>}}
- [Blender Documentation: Shading](https://docs.blender.org/manual/en/latest/scene_layout/object/editing/shading.html)
{{</citations>}}

---

## Object appearance
### Apply Material to Object

{{< notes >}}
Blender’s **Shading Tab** allows you to apply complex materials to your objects, including gloss, transparency, and other physical properties. Experimenting with the `Principled BSDF` shader can give you a wide range of effects.
{{< /notes >}}

{{< horizontal >}}

- Go to the **Shading** tab and select **Use Nodes**.
- Explore the options under **Principled BSDF**:
- Increase **Subsurface** to make materials look soft.
- Use the `Add > Search` function to find shaders like **Glass** for transparency effects.

{{< figure src="img/blender-material-nodes.png">}}

{{< /horizontal >}}

{{<citations>}}
- [Blender Documentation: Materials](https://docs.blender.org/manual/en/latest/render/materials/introduction.html)
{{</citations>}}

---

## Denoising the Render

{{< notes >}}
Blender includes a denoising feature to remove noise from rendered images, improving quality without significantly increasing render time.
{{< /notes >}}

{{< horizontal >}}

- In the **Rendering Tab**, under `View Layer Properties`:
- Under `Passes > Data`, select **Denoising Data**.
- In the **Compositing Tab**:
- Check the **Use Nodes** checkbox.
- Add a **Denoise** node (`Add > Search > Denoise`) and connect the nodes as follows:
  - Connect `Render Denoising Normal` and `Denoising Albedo` to `Normal` and `Albedo` of the Denoise node.
  - Connect `Image` from the Denoise node to `Image` of the Composite node.

{{< figure src="img/blender-denoising.png">}}

{{< /horizontal >}}

{{<citations>}}
- [Blender Documentation: Reducing Noise](https://docs.blender.org/manual/en/latest/render/cycles/optimizations/reducing_noise.html)
{{</citations>}}

---

## Happy rendering!

{{< notes >}}
Once you've completed these steps, you will have a beautifully rendered scene in Blender. Feel free to explore 
Blender's other features, experiment with different materials, lighting setups, and camera angles to get the best results.
{{< /notes >}}

{{< figure src="img/blender-render-result.png" width="85%" class="center">}}