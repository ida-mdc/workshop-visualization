#!/usr/bin/env python3
"""The figure on the "a mesh that starts adaptive" slide: t8code, for real.

The slide's own claim is "coloring a t8code mesh by its refinement level in
ParaView shows the adaptivity itself" - this is that picture, made with the
actual library rather than described secondhand.

tools/t8-armadillo-forest.cxx is a small driver against a real t8code
checkout: start from one coarse cube (a single hypercube tree, level 0) and
refine it with t8_forest_new_adapt wherever a cell touches the Armadillo's
real surface, up to level 6 - reusing static/data/armadillo-voxels.bin, the
exact same 64^3 surface-occupancy grid the octree-build.js scene builds its
octree from (see tools/make-armadillo-voxels.py). A mesh built this way is
adaptive from construction, which is the whole point t8code is making that a
simplified-after-the-fact mesh is not.

Building t8code is a one-time setup, not something to redo per figure:

    git clone --recursive https://github.com/DLR-AMR/t8code.git
    cd t8code && git fetch --unshallow --tags   # cmake needs `git describe`
    cmake -S . -B build -DCMAKE_BUILD_TYPE=Release -DT8CODE_ENABLE_MPI=OFF \\
        -DT8CODE_BUILD_TESTS=OFF -DT8CODE_BUILD_TUTORIALS=OFF \\
        -DT8CODE_BUILD_BENCHMARKS=OFF -DT8CODE_BUILD_EXAMPLES=OFF \\
        -DT8CODE_ENABLE_VTK=OFF
    cmake --build build -j"$(nproc)"

MPI is off on purpose: t8code scales to a million ranks, but a single coarse
cube around one scan needs exactly one of them, and skipping MPI means
skipping a system package this repo does not otherwise need. Then compile
and run the driver against that checkout (T8=path to the t8code clone above):

    g++ -std=c++20 -O2 \\
        -I $T8/src -I $T8/build/src \\
        -I $T8/build/_deps/sc-build/include -I $T8/build/_deps/sc-src/src \\
        -I $T8/build/_deps/p4est-build/include -I $T8/build/_deps/p4est-src/src \\
        tools/t8-armadillo-forest.cxx \\
        -L $T8/build/src -L $T8/build/_deps/sc-build -L $T8/build/_deps/p4est-build \\
        -lt8 -lp4est -lsc \\
        -Wl,-rpath,$T8/build/src -Wl,-rpath,$T8/build/_deps/sc-build \\
        -Wl,-rpath,$T8/build/_deps/p4est-build \\
        -o armadillo-forest
    ./armadillo-forest static/data/armadillo-voxels.bin armadillo_forest

That writes armadillo_forest.pvtu / armadillo_forest_0000.vtu - a real,
loadable-in-ParaView adaptive mesh. This script does the rest: slice it
through the middle (a flat cross-section is where the grading from coarse to
fine actually reads clearly - the 3D forest is mostly large cells hiding the
detail behind their own outer faces) and color by the `level` field the
driver asked t8code to write.

    tools/make-t8code-armadillo.py armadillo_forest_0000.vtu [out.png]
"""
import sys
from pathlib import Path

import numpy as np
import pyvista as pv
from PIL import Image


def main(vtu_path: Path, out_path: Path):
    pv.OFF_SCREEN = True
    mesh = pv.read(vtu_path)
    sl = mesh.slice(normal="z", origin=(0.5, 0.5, 0.5))
    edges = sl.extract_feature_edges(
        boundary_edges=True, feature_edges=False, manifold_edges=False, non_manifold_edges=True)

    pl = pv.Plotter(off_screen=True, window_size=(1000, 1000))
    pl.set_background("white")
    pl.add_mesh(sl, scalars="level", cmap="viridis", show_edges=False, show_scalar_bar=True,
                scalar_bar_args={"title": "refinement level", "color": "black"})
    pl.add_mesh(edges, color="black", line_width=1.2)
    pl.camera_position = "xy"
    raw_path = out_path.with_suffix(".raw.png")
    pl.screenshot(str(raw_path))
    print(f"{sl.n_cells} cells in the slice, levels "
          f"{int(sl.cell_data['level'].min())}..{int(sl.cell_data['level'].max())}")

    # pyvista always renders into the full window; crop the white margin
    # around the grid and colorbar so the figure isn't mostly padding.
    im = Image.open(raw_path).convert("RGB")
    arr = np.array(im)
    mask = ~np.all(arr > 250, axis=-1)
    ys, xs = np.nonzero(mask)
    pad = 12
    box = (max(xs.min() - pad, 0), max(ys.min() - pad, 0),
           min(xs.max() + pad, arr.shape[1]), min(ys.max() + pad, arr.shape[0]))
    im.crop(box).save(out_path)
    raw_path.unlink()
    print(f"wrote {out_path}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(Path(sys.argv[1]), Path(sys.argv[2]) if len(sys.argv) > 2 else Path("t8code-armadillo.png"))
