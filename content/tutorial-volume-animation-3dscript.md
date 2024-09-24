---
title: "Volumetric dataset animation rendering using 3DScript"
date: 2024-09-09
draft: false
layout: workshop
author: Deborah Schmidt
author_position: Helmholtz Imaging | MDC Berlin
description: Short tutorial how to automate 3D volumetric dataset animations using the 3DScript Fiji plugin.
cover: https://gitlab.com/album-app/catalogs/image-challenges/-/raw/visualization-animate-with-3dscript-0.1.2/solutions/visualization/animate-with-3dscript/cover.jpg
---

## Introduction

{{< notes >}}
**3DScript** is a powerful plugin for **Fiji** that allows scientists to create and automate complex 3D animations for visualizing volumetric datasets. The plugin provides a scripting interface where users can define the camera movements and animations frame by frame in a simple text-based format. 
{{< /notes >}}

- **Text-based animation editor**: Allows you to script 3D animations without the need for complex graphical interfaces.
- **Fiji integration**: The plugin integrates smoothly with Fiji, enabling you to create animations directly from your 3D datasets.
- **Simple syntax**: Easy-to-understand syntax for rotating, zooming, and panning 3D objects.
- **Automated workflow**: Allows for batch rendering of animations, making it ideal for automated processing pipelines.

{{<figure src="https://gitlab.com/album-app/catalogs/image-challenges/-/raw/visualization-animate-with-3dscript-0.1.2/solutions/visualization/animate-with-3dscript/cover.jpg">}}

{{<citations>}}
- Schmid, B.; Tripal, P. & Fraaß, T. et al. (2019), "[3Dscript: animating 3D/4D microscopy data using a 
  natural-language-based syntax](https://www.nature.com/articles/s41592-019-0359-1)", Nature methods 16(4): 278-280, 
  PMID 30886414.
- [Project website](https://bene51.github.io/3Dscript/)
{{</citations>}}


---

## How to install and call the plugin

{{< notes >}}
To install the **3DScript** plugin for Fiji, follow the steps below.
{{< /notes >}}

1. Download and install [**Fiji**](https://fiji.sc/), an open-source image processing package.
2. Install the **3DScript** plugin via the Fiji update site.
   - In Fiji, go to **Help > Update** and manage update sites.
   - Add the **3DScript update site**.
   - Install and restart Fiji.
3. Open the image you want to animate. Only 8bit and 16bit images are supported.
4. Access **3DScript** from the **Animation** panel in Fiji.

---

## Automation of plugin usage with Album solution

{{< notes >}}
By using the Album solution for 3DScript, you can automate the entire animation process in a headless, reproducible manner. This enables you to script animations once and run them repeatedly on different datasets without needing manual interaction..
{{< /notes >}}

{{< solution-in-tutorial catalog="image-challenges" group="visualization" solution="animate-with-3dscript" version="0.1.0" >}}

---


## The 3DScript Editor

{{< notes >}}
The **3DScript Editor** is the main interface for writing scripts to control 3D animations. You define animations using simple commands like **rotate**, **zoom**, and **pan**. This section will guide you through writing your first script for animating a 3D dataset.
{{< /notes >}}

On the panel on the right in Fiji, click on **Animation**, and then click on **Start text-based animation editor**. This will open the **3DScript Editor** where you can write and run your animation scripts.

### Example Script:

```text
From frame 0 to frame 400:
- rotate by 360 degrees horizontally
- rotate by 60 degrees vertically
```

1. Enter this script in the editor and adjust the values to your liking.
2. Click **Run** to create the animation. The result will be saved as an image stack in Fiji.
3. Store the animation file on your hard drive for future use or to automate the process with Album.

---

## Play with the script

{{< notes >}}
Once you’ve tried the basic script, you can experiment with different parameters like **zooming**, **rotating**, and **panning** to customize your animation further. The 3DScript syntax is flexible and allows you to create complex animations with minimal effort.
{{< /notes >}}

Try adding these commands to the script to make it more dynamic:

```text
From frame 0 to frame 200:
- zoom by 200%

From frame 200 to frame 400:
- pan left by 30 degrees
- rotate by 180 degrees
```

This will create a more complex animation where the object zooms in for the first 200 frames and then pans and rotates for the next 200 frames.


{{<citations>}}
- [3DScript Gallery with more examples](https://bene51.github.io/3Dscript/gallery.html)
{{</citations>}}

---

## Tips when using the Album solution

{{< notes >}}
The Album solution for 3DScript makes it possible to automate the rendering of animations without manually interacting with the Fiji interface. This is particularly useful for batch processing or when you need to generate consistent animations across multiple datasets.
{{< /notes >}}

### Key Parameters for Headless Rendering:

- **animation_file**: The path to the text file containing the 3DScript commands (e.g., `MY_FOLDER/animation.txt`).
- **output**: The path where the rendered animation should be saved (e.g., `MY_FOLDER/raw_animation.avi`).
- **width** and **height**: The dimensions of the output video (e.g., `width: 800`, `height: 600`).
