# 🛠️ Workshop Pre-Installation Guide

Two things to install before you arrive: **Blender** and **uv**. Everything
else is set up during the session that needs it, from the files in this folder.

**Pro tip:** if you have never used the Terminal (Linux/Mac) or PowerShell
(Windows) and get stuck, paste the steps into ChatGPT/Gemini and ask for help.

---

## 1. Blender

The newest release, from [blender.org/download](https://www.blender.org/download/).

We use it on Tuesday for mesh rendering and mesh cutting, and for the
Microscopy Nodes demo.

---

## 2. uv

`uv` is a fast Python package manager. We use it to build a small, throwaway
environment per session, so nothing lands in your system Python.

🐧 **macOS / Linux** - in your Bash/Zsh terminal:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

🪟 **Windows** - in PowerShell or Command Prompt:

```powershell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

**Any OS**, if you would rather install it from Python (needs `pip`):

```bash
pip install --user pipx
pipx install uv
```

Check it worked:

```bash
uv --version
```

That is everything you need to do beforehand.

---

## During the workshop

Each notebook session has its own requirements file in this folder. There is
nothing to install in advance - we do it together, and it takes a minute or
two each.

| file | session | notebooks |
| :--- | :--- | :--- |
| `requirements_volumetric.txt` | Volumetric Data Rendering | `voxel_rendering_vtk`, `voxel_rendering_pygfx` |
| `requirements_ngff.txt` | Large 3D data | `tiff_to_ngff_and_neuroglancer` |
| `requirements_mesh.txt` | Meshes | `voxel_to_mesh`, `mesh_rendering_tutorial` |
| `requirements_pointclouds.txt` | Point Clouds | `point_clouds_tutorial` |
| `requirements_vector_field.txt` | Vector Fields | `vector_field_visualization` |
| `requirements_luxar.txt` | Large 3D data, Gaussian splats | `luxar_gaussian_splats` |

They all work the same way, and each file carries its own three lines at the
top. For the meshes session:

```bash
uv venv .venv_mesh --python 3.12
uv pip install --python .venv_mesh -r visualization_software/requirements_mesh.txt
uv run --python .venv_mesh jupyter lab
```

A separate environment per session, so installing one cannot disturb another.
Delete the `.venv_*` folders whenever you want the space back.

Versions are pinned. If a fresh install fails, tell us rather than working
around it - a pinned file that no longer resolves is a bug we want to hear
about.

`requirements_luxar.txt` is the one session that needs an **NVIDIA GPU**. Its
notebook also installs a CUDA toolchain itself, in step 2, because which
version it needs depends on the torch that came with it.
