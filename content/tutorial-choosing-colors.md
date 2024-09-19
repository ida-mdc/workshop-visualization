---
title: "Choosing colors for scientific 3D renderings"
date: 2024-09-09
draft: false
layout: workshop
author: Deborah Schmidt
author_position: Head of Helmholtz Imaging Support Unit
description: In this short tutorial, I will share tips and tricks for choosing colors for scientific 3D renderings.
cover: img/color-palettes.jpg
---

## Color Representation in Digital Programs

{{< notes >}}
Colors in digital visualizations are represented using different models, such as **HEX**, **RGB**, and **HSL**. 
Digital programs might use different representations of colors - understanding how these models work can help you 
apply colors across tools.
{{< /notes >}}

{{< horizontal >}}
{{< block >}}
### RGB 
- `rgb(255, 87, 51)`
{{< notes >}}
- Red, Green, Blue values (0-255)
- Example: `rgb(255, 87, 51)` representing orange
{{< /notes >}}
### HEX 
- `#FF5733`
{{< notes >}}
- Six-character code for RGB, encoded in hexadecimal
- two characters for each of the Red, Green, and Blue channels
- Example: `#FF5733` represents orange, a color with maximum red (`FF`), moderate green (`57`), and low blue (`33`)
{{< /notes >}}
{{< /block >}}

{{< block >}}

### HSL 
- `hsl(9, 100%, 60%)`
{{< notes >}}
- Hue (0-360 degrees), Saturation & Lightness (0-100%)
- Example:  `hsl(9, 100%, 60%)` represents orange, with a hue of 9°, fully saturated, and 60% lightness
{{< /notes >}}
### Transparency
- `rgba(255, 87, 51, 255)`
- `#FF5733FF`

{{< /block >}}

{{< /horizontal >}}


---

## Color palettes
{{< notes >}}
Selecting an appropriate color palette is crucial for both aesthetic and functional reasons in 3D visualizations. It can help emphasize key elements and ensure the visual representation is clear and accessible. 

You can find various collections of color palettes online. Here is one example:
{{< /notes >}}

{{< center >}}
{{< figure src="img/color-palettes.jpg" >}}
{{< /center >}}

{{< notes >}}
Tools like **Coolors** provide great color palette generators, but it’s important to go beyond just selecting colors 
that look aesthetically pleasing. We want to consider the purpose and function of the visualization, as well as the 
theory behind colors. 
{{< /notes >}}

{{< citations >}}
- [https://coloors.io](https://coloors.io)
{{</ citations >}}

---

## Color and colormap theory
{{< notes >}}
Color theory helps us understand how colors interact, how we perceive them, and how they can be used effectively in 
scientific visualizations. Our perception of color is influenced by both biological factors (e.g., color blindness) and the context in which colors are presented.
{{< /notes >}}

TODO example colormap image for each bullet point

- **Harmonizing colors**
{{< notes >}}
- often found next to each other on the color wheel (like blue and green), and they create a sense of balance in visualizations.
{{< /notes >}}
- **Contrasting colors**
{{< notes >}}
- like red and green, are on opposite sides of the color wheel and create visual tension, which can be useful for highlighting important data.
{{< /notes >}}
- **Perception of contrast varies**
{{< notes >}}
- we perceive contrast more strongly with some colors (like red) compared to others (like blue), making some 
  colors more effective for highlighting key elements in visualizations.
{{< /notes >}}


{{< notes >}}
Check out the [Matplotlib Colormap Guide](https://matplotlib.org/stable/users/explain/colors/colormaps.html), 
containing not just contain a comprehensive list of colormaps available in Matplotlib, but also valuable knowledge about 
when to use which colormaps. Brief summary:
{{< /notes >}}

- **Sequential colormaps**
{{< notes >}}
- are best for data that progress from low to high values (e.g., depth or intensity).
{{< /notes >}}
- **Diverging colormaps** 
{{< notes >}}
- should be used when you have a critical midpoint in your data that you want to emphasize, such as positive vs. negative values.
{{< /notes >}}
- **Qualitative colormaps** 
{{< notes >}}
- are ideal for categorical data with no inherent order (e.g., different materials or regions in a dataset).
{{< /notes >}}
- Avoid using the **Jet colormap** 
{{< notes >}}
- as it can distort data, especially when used for sequential data. Instead, use perceptually uniform colormaps like **Viridis** or **Cividis**.
{{< /notes >}}


{{< citations >}}
- [Matplotlib Colormaps Guide](https://matplotlib.org/stable/users/explain/colors/colormaps.html)
- [Color Theory on Wikipedia](https://en.wikipedia.org/wiki/Color_theory)
{{</ citations >}}

---

## Target audience expectations
{{< notes >}}
When choosing colors for your visualization, consider the expectations of your audience. In many fields, certain colors have established meanings or are commonly used for specific types of data. Following these conventions can make your visualizations easier to interpret.

For example, in medical imaging, certain tissues or structures are often shown in standardized colors (e.g., red for arteries, blue for veins). In geospatial data, elevation might be shown with green for low areas and brown for high areas. Using unexpected colors can confuse viewers or lead to misinterpretation.
{{< /notes >}}

TODO images for both examples

- **Medical imaging**: Red is commonly used for heat maps or highlighting areas of concern, while blue is used for normal regions.
- **Geospatial data**: Topographical maps often use blue for water, green for lower elevation, and brown for higher elevation.

---

## Color accessibility
{{< notes >}}
Color accessibility is essential to ensure that your visualizations can be interpreted by individuals with color vision deficiencies. By selecting accessible color palettes, you can improve the inclusivity of your visualizations.

Tools like **Fiji** allow you to simulate color blindness, helping you verify that your color choices are accessible to everyone. You can download Fiji [here](https://fiji.sc/).
{{< /notes >}}

{{< center >}}
{{< figure src="img/color-accessibility.jpg" >}}

- **Fiji  ▷ Image ▷ Color ▷ Simulate Color Blindness**

{{< /center >}}

---

## Picking colors yourself
{{< notes >}}
Sometimes, the best color palettes can be inspired by your surroundings. Here are some fun and creative ways to choose colors for your scientific visualizations:
- **Video games**: Many video games are beautifully designed with carefully chosen color palettes. Take a screenshot of a game with an atmosphere you like and use a color picker tool to extract the colors.
- **Photography**: Take pictures of sunsets, landscapes, or even advertisements that catch your eye. These images often contain harmonious color schemes that can inspire your visualization.
- **Tools for Picking Colors**: All major operating systems have color picker tools. You can use:
  - **macOS**: The built-in Digital Color Meter.
  - **Windows**: Tools like **ColorPic** or the Snipping Tool with its color picker extension (*authors note: this 
    is a suggestion from ChatGPT, I didn't verify it*).
  - **Linux**: For example the **Gpick** color picker or **KColorChooser**.
  
Image editors or graphical design tools such as Gimp or Inkscape (staying in Open Source domain here) have built in 
color pickers as well. 
{{< /notes >}}

TODO example

---

{{< unlisted >}}

## Have fun!

{{< notes >}}
Go pick a palette, apply it to your data, test it for accessibility and show it to folks from your target audience. 
Color picking can be very entertaining and crucial for telling the story you want to tell with the rendering.
{{< /notes >}}

TODO some image