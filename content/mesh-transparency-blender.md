---
title: "Ways to Make Things Transparent in Blender"
date: 2026-09-25
draft: false
layout: workshop
type: page
author: Deborah Schmidt
author_position: Helmholtz Imaging | MDC Berlin
description: Several different ways Blender can make an object see-through, why they look different, and what each one is actually good for - using the ant and frog scans from earlier in the workshop.
cover: img/blender-transparency-cover.png
background: transparent
---

## Introduction

{{< tutorial-link link="mesh-rendering-blender" >}}

---

## Alpha

<div class="hero-overlay">
{{< figure src="img/blender-alpha-render.png" caption="Alpha 0.45" >}}
</div>

{{< citations >}}
- Ant: [Antscan](https://biomedisa.info/antscan/specimen/1031) specimen 1031, *Acromyrmex balzani*, CC BY 4.0
{{< /citations >}}

---

## Transmission

<div class="hero-overlay">
{{< figure src="img/blender-transmission-render.png" caption="Transmission Weight 1.0 · Roughness 0.02 · IOR 1.45" >}}
</div>

{{< citations >}}
- Frog: [Kleinteich & Gorb](https://doi.org/10.5061/dryad.066mr), CC0
{{< /citations >}}

---

## Transparent

<div class="hero-overlay">
{{< figure src="img/glass-dome-transparent.png" caption="Alpha 0.15 · no Transmission" >}}
</div>

---

## Satin glass

<div class="hero-overlay">
{{< figure src="img/glass-dome-satin.png" caption="Transmission Weight 1.0 · Roughness 0.15" >}}
</div>

---

## Glass

<div class="hero-overlay">
{{< figure src="img/glass-dome-glass.png" caption="Transmission Weight 1.0 · Roughness 0.02 · IOR 1.45" >}}
</div>

---

## Tinted glass

<div class="hero-overlay">
{{< figure src="img/glass-dome-tinted-glass.png" caption="Transmission Weight 1.0 · Roughness 0.02 · IOR 1.45 · Base Color amber" >}}
</div>

---

## Thin-walled glass

<div class="hero-overlay">
{{< figure src="img/glass-dome-thin-walled.png" caption="Transmission Weight 1.0 · Roughness 0.02 · IOR 1.45 · Thin Wall on" >}}
</div>

---

## Crystal

<div class="hero-overlay">
{{< figure src="img/glass-dome-crystal.png" caption="Transmission Weight 1.0 · Roughness 0.0 · IOR 2.42" >}}
</div>

{{< citations >}}
- Ant: [Antscan](https://biomedisa.info/antscan/specimen/1031) specimen 1031, *Acromyrmex balzani*, CC BY 4.0
{{< /citations >}}

---

## Subsurface and glass

<div class="hero-overlay">
{{< figure src="img/blender-frog-mix-shader.png" caption="Top: Subsurface Weight 1.0, Radius (0.01, 2.2, 0.05), Scale 2.0 · Bottom: Transmission Weight 1.0, Roughness 0.02, IOR 1.45" >}}
</div>

{{< citations >}}
- Frog: [Kleinteich & Gorb](https://doi.org/10.5061/dryad.066mr), CC0
{{< /citations >}}

---

## The difference

- **Alpha** - blends with what's behind, nothing bends
- **Transmission** - light actually refracts through
- **Subsurface** - light scatters inside, exits elsewhere
- Roughness, IOR, Thin Wall - shape Transmission, don't replace it
