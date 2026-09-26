---
title: "Vector fields"
date: 2026-09-22
draft: false
type: page
layout: workshop
author: Deborah Schmidt
author_position: Head of Helmholtz Imaging Support Unit, MDC Berlin
description: What a vector field is, where they come from, and the difference between sampling one and integrating it.
cover: img/bg.jpg
---

## Vector field data
### A direction at every location

{{< notes >}}
This field is transport through the specimen - sap rising up the stem, dividing
at the receptacle, running out along each petal. It is the same object as the
other three scenes, measured differently.

Glyphs and streamlines are that one field answering different questions. A glyph
is local and honest: one arrow, one sample. Turn the density up and they become
a hedge you cannot see through.

A streamline traces where a particle would go. It reads instantly, but it is an
integration: the curve between two samples is a claim the data never made. Both
are legitimate. Say which one you used.

Note also that the field is masked - drawn only where there is transport. Almost
every real vector field figure is masked, and almost none of them say so.
{{< /notes >}}

- **On a grid** - uniform, rectilinear or curvilinear; one vector per cell
- **On an unstructured mesh** - one vector per node or per cell, fine where the physics is
- **Steady or time-dependent** - streamlines for the first, pathlines and particle traces for the second

{{< scene name="vector-field" height="420" caption="Glyphs sample. Streamlines integrate - the curve between two samples is inferred, not measured." >}}
