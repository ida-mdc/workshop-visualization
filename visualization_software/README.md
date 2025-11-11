# 🛠️ Workshop Pre-Installation Guide

To ensure a smooth and productive workshop, please complete all the installations listed below **before** the start date.  

This workshop uses:
* standalone visualization tools 
* and Python packages managed by the fast package manager, `uv`.

## 1. Standalone Application Installation

Please follow the instructions on their respective websites.

| Software | Purpose                                                                      | Installation Link                                                                                 |
| :--- |:-----------------------------------------------------------------------------|:--------------------------------------------------------------------------------------------------|
| **Blender** | 3D Modeling and Rendering                                                    | [https://www.blender.org/download/](https://www.blender.org/download/)                            |
| **Meshlab** | 3D Mesh Processing                                                           | [http://www.meshlab.net/#download](http://www.meshlab.net/#download)                              |
| **ParaView** | 3D Visualization                                                            | [https://www.paraview.org/download/](https://www.paraview.org/download/)                          |
| **Fiji (ImageJ)** | Image Analysis   <br/>(please install the MoBIE plugin - instructions below) | [https://imagej.net/software/fiji/downloads](https://imagej.net/software/fiji/downloads)          |

### Install the MoBIE plugin in Fiji

After you have installed the core Fiji application:
1.  Open Fiji, navigate to **Help > Update...**
2.  In the **ImageJ Updater** window, click **Manage update sites**.
3.  Scroll down, check the box next to the **MoBIE** update site, and click **Close**.
4.  Click **Apply changes** and restart Fiji when prompted.

---

## 2. Python Environment Setup (using `uv`)

**Pro tip: If you never used the Terminal (Linux/Mac) or PowerShell (Windows), and experiencing difficulties following, paste the steps to ChatGPT/Gemini and ask for help.**

We will use the package manager `uv` to create a dedicated, isolated environment for our workshop.

### Step 2.1: Install `uv`

The best way to install uv is using the standalone installer for your operating system.   
Choose one command below to install the uv tool globally on your system.

🐧 macOS / Linux  
Run this command in your Bash/Zsh terminal:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

🪟 Windows

Run this command in your PowerShell or Command Prompt terminal. 

```powershell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

OR (in any OS)

If you prefer a Python-only installation (requires `pip`):
```bash
# Installs pipx globally, then uses pipx to install uv.
pip install --user pipx
pipx install uv
```

### Step 2.2: Create and Activate the Workshop Environment

First, create a new directory for your workshop files and navigate into it.  
e.g.

```bash
mkdir -p workshop-project && cd workshop-project
```

Now, create the virtual environment inside this directory.

```bash
uv venv .venv --python 3.11
```

Finally, activate the environment using the command specific to your operating system/shell:

🐧 macOS / Linux (Bash/Zsh)

```bash
### macOS/Linux (Bash/Zsh): ###
source .venv/bin/activate
```

🪟 Windows

```bash

##### Windows (Command Prompt): ######
.venv\Scripts\activate
```
OR
```bash
##### Windows (PowerShell): #####
.venv\Scripts\Activate.ps1
```

### Step 2.3: Install Required Python Packages

With the environment activated, install the required packages using `uv`:

```bash
uv pip install "napari[all]" pixel-patrol vtk jupyterlab "pyvista[all]"
```

### 3. Verify Installations

To verify that everything is installed correctly, please run the following commands in your terminal:

```bash
uv run python -c "import napari, vtk, pixel_patrol; print('OK: Python packages are installed')"
```

If you see `OK` printed without any errors, your installations are successful!

You can also try launching the applications to ensure they open correctly:

```bash
uv run napari    # starts the viewer
```

Lastly , check the Pixel Patrol commands:

```bash
uv run pixel-patrol --help # shows Pixel Patrol commands  
```

### 4. Deactivation of the Environment

When you are done working in the workshop environment, you can deactivate it by simply running:

```bash
deactivate
```

If you encounter any issues during installation, please reach out to the workshop organizers for assistance. We look forward to seeing you at the workshop!

ella.bahry (at) mdc-berlin (dot) de
