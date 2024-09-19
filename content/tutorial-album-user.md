---
title: "How to install and use Album - a tool for decentralized software use case sharing"
date: 2024-09-09
draft: false
layout: workshop
author: Deborah Schmidt
author_position: Head of Helmholtz Imaging Support Unit
description: "Did someone share an Album solution or catalog with you and you have never heard of the tool? This tutorial will summarize what Album does, and how you can install and use it."
cover: img/album/everything-is-a-solution-dark.png
---

## Why does Album exist?
{{< center >}}
{{< figure src="img/album/album-comparison.png" >}}
{{< /center >}}

{{< notes >}}
- In science, commercial tools exist and can be very useful, but to push the boundaries of knowledge and stay ahead of new developments, scientists often rely on **open-source tools** and **custom software**.
- This results in scientists needing to figure out which tools solve their problems, how to install them, and how to use them, which leads to a diverse and sometimes confusing ecosystem.
- While there are IT solutions that help with **unifying software use cases** (like Docker or virtual environments), these tools are often challenging for non-computer experts due to their complexity and the risk of version conflicts. 
- **Album** exists to solve this problem by making it easier to manage, share, and use scientific software solutions without requiring deep technical expertise.
{{</ notes >}}

---

## How does it work?

{{< notes >}}

- Each **Album solution** is essentially a **single script** (written in Python) that wraps a specific **software use 
  case**.
- This script describes:
  - The **software dependencies** required for the solution.
  - The **metadata** of the use case (such as who to cite, arguments available, and links to further documentation).
  - The **launch parameters** and run routine for the specific use case.
- Album handles the entire installation process by automatically installing a virtual environment for each solution 
  individually, and it offers a clean, uniform interface to run different tools, both from a graphical interface or 
  from command line.
{{</ notes >}}

{{< horizontal >}}

{{< figure src="img/album/album-schema-people-big.png" width="900" caption="Solutions can **wrap different tools and libraries**. They can be bundled in catalogs and **shared with users who don't have any coding experience**." >}}
{{< figure src="img/album/album-schema-simple-big.png" caption="Album exists as **command line** and **graphical user interface**. Each solution is executed in it's own virtual environment. Catalogs are git repositories and can be hosted locally or i.e. on gitlab or github." >}}

{{< /horizontal >}}

---

## How to install
{{< notes >}}
You can download the **one-file installers** for Album directly from the [official website](https://album.solutions). These installers are available for **Linux**, **Windows**, and **macOS**.
Alternatively, Album can be installed via **pip** or **conda**.
{{</ notes >}}
{{< space />}}
{{< center >}}
{{< figure src="img/logos/win-mac-linux.png" width="400px" >}}

**https://docs.album.solutions**
{{< /center >}}
{{< space />}}
{{< center >}}
- via **single executable installer** (includes graphical user interface)
- via **pip** (command line interface): `pip install album`
- via **conda** or **micromamba** (command line interface): `conda install album -c conda-forge`
{{< /center >}}
{{< space />}}

---

## How to run Album solutions
{{< notes >}}
### How are solutions shared? Via catalogs!
- Catalogs are collections of Album solutions bundled together to make them easy to share and distribute.
- Each catalog is essentially a **git repository** that can be identified by a **URL** or a **local path**.
- For example, the **Image Challenges catalog** written and curated by the Album development team at Helmholtz Imaging can be added easily, and it bundles solutions that are specific to image processing and visualization tasks.
{{</ notes >}}

{{< horizontal >}}
{{< figure src="img/album/screenshot-gui.png" >}}

- Click `Catalogs > Add Catalog > CATALOG_URL`
- Scroll to solution / use search bar
- Select the solution and press `Run` 
{{< /horizontal >}}

{{< horizontal >}}
{{< figure src="img/album/screenshot-terminal.png" >}}

```
album add-catalog CATALOG_URL
album index
album install GROUP:NAME:VERSION
album info GROUP:NAME:VERSION
album run GROUP:NAME:VERSION
```
{{< /horizontal >}}

---

## Updating a catalog
{{< notes >}}
TODO
{{</ notes >}}

TODO

---

## Community

{{< notes >}}
- Album is a collaborative project developed by the Helmholtz Imaging team with contributions from the broader 
scientific software community.
- We encourage users to share their solutions, contribute to the codebase, and help improve the platform.
{{</ notes >}}

- **Go to https://album.solutions for more information about how to use Album.**
- **The source code is available on https://gitlab.com/album-app/album.**

{{< space />}}


{{< center >}}
Album developers:
{{< /center >}}

{{< center-center >}}
{{< person name="Jan Philipp Albrecht" img="https://secure.gravatar.com/avatar/608e35700885b69f8c3923484b0aa4db4fc5be564b85e3e4ae282a4593a34ceb?s=1600&d=identicon">}}
{{< person name="Deborah Schmidt" img="https://gitlab.com/uploads/-/system/user/avatar/8168882/avatar.png?width=800">}}
{{< person name="Kyle Harrington" img="https://gitlab.com/uploads/-/system/user/avatar/637845/avatar.png?width=800">}}
{{< person name="Lucas Rieckert" img="https://gitlab.com/uploads/-/system/user/avatar/11275547/avatar.png?width=800">}}
{{< person name="Maximilian Otto" img="https://secure.gravatar.com/avatar/b3084dd1e942e5b2b6a8e7d5d8bc7aa930b31ddcd5b9f66f0585063f38e1aa5a?s=1600&d=identicon">}}
{{< /center-center >}}
