// Turning a volume into a surface.
//
// This is "surface nets", a dual method: one vertex per grid cell that
// straddles the threshold, placed at the average of the crossings on that
// cell's edges, then a quad for every grid edge whose two ends disagree.
//
// Marching cubes, which is the algorithm the meshes session names and the one
// every toolkit ships, is a *primal* method - it places vertices on the edges
// and picks triangles from a 256-entry lookup table. The surfaces the two
// produce are near enough identical, and everything these slides use an
// isosurface to argue is true of both: the threshold is a choice nobody can
// make for you, the staircase is the sampling and not the specimen, and the
// vertex count is set by the grid rather than by the shape.
//
// Surface nets is here rather than marching cubes because it needs no tables,
// which means it can be read and checked on one screen.

import { THREE } from './runtime.js';

/**
 * Extract an isosurface at `level` from `sample(x, y, z)` over `bounds`.
 *
 * `res` is the number of samples along x; y and z follow from the bounds so
 * the sampling stays isotropic. Returns a BufferGeometry, plus the counts the
 * scene wants to display.
 */
export function extract({ sample, bounds, level, res }) {
  const step = (2 * bounds.x) / res;
  const nx = res + 1;
  const ny = Math.max(2, Math.round((2 * bounds.y) / step)) + 1;
  const nz = Math.max(2, Math.round((2 * bounds.z) / step)) + 1;

  const at = (i, j, k) => [
    -bounds.x + i * step, -bounds.y + j * step, -bounds.z + k * step,
  ];

  // Sample the whole grid once. Sampling inside the cell loops instead would
  // evaluate every interior point eight times.
  const field = new Float32Array(nx * ny * nz);
  const idx = (i, j, k) => (k * ny + j) * nx + i;
  for (let k = 0; k < nz; k++) {
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const [x, y, z] = at(i, j, k);
        field[idx(i, j, k)] = sample(x, y, z);
      }
    }
  }

  // One vertex per straddling cell. -1 means "this cell has no vertex".
  const cellVertex = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1);
  const cellIdx = (i, j, k) => (k * (ny - 1) + j) * (nx - 1) + i;
  const positions = [];

  // The twelve edges of a cell, as pairs of its eight corners.
  const CORNERS = [
    [0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0],
    [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1],
  ];
  const EDGES = [
    [0, 1], [2, 3], [4, 5], [6, 7],
    [0, 2], [1, 3], [4, 6], [5, 7],
    [0, 4], [1, 5], [2, 6], [3, 7],
  ];

  for (let k = 0; k < nz - 1; k++) {
    for (let j = 0; j < ny - 1; j++) {
      for (let i = 0; i < nx - 1; i++) {
        const v = CORNERS.map(([di, dj, dk]) => field[idx(i + di, j + dj, k + dk)]);
        let inside = 0;
        for (let c = 0; c < 8; c++) if (v[c] >= level) inside++;
        if (inside === 0 || inside === 8) continue;   // no crossing here

        // Average of where the surface cuts this cell's edges, which is what
        // makes the result smooth rather than blocky.
        let sx = 0;
        let sy = 0;
        let sz = 0;
        let n = 0;
        for (const [a, b] of EDGES) {
          const va = v[a];
          const vb = v[b];
          if ((va >= level) === (vb >= level)) continue;
          const t = (level - va) / (vb - va);
          const ca = CORNERS[a];
          const cb = CORNERS[b];
          sx += ca[0] + (cb[0] - ca[0]) * t;
          sy += ca[1] + (cb[1] - ca[1]) * t;
          sz += ca[2] + (cb[2] - ca[2]) * t;
          n++;
        }
        const [ox, oy, oz] = at(i, j, k);
        cellVertex[cellIdx(i, j, k)] = positions.length / 3;
        positions.push(ox + (sx / n) * step, oy + (sy / n) * step, oz + (sz / n) * step);
      }
    }
  }

  // A quad per grid edge whose ends disagree, joining the four cells around
  // it. Winding follows the sign, so all the normals end up facing outwards.
  const tris = [];
  const quad = (a, b, c, d, flip) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (flip) tris.push(a, b, c, a, c, d);
    else tris.push(a, c, b, a, d, c);
  };

  for (let k = 0; k < nz; k++) {
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const here = field[idx(i, j, k)] >= level;
        if (i + 1 < nx && j > 0 && k > 0 && (field[idx(i + 1, j, k)] >= level) !== here) {
          quad(cellVertex[cellIdx(i, j - 1, k - 1)], cellVertex[cellIdx(i, j, k - 1)],
            cellVertex[cellIdx(i, j, k)], cellVertex[cellIdx(i, j - 1, k)], here);
        }
        if (j + 1 < ny && i > 0 && k > 0 && (field[idx(i, j + 1, k)] >= level) !== here) {
          quad(cellVertex[cellIdx(i - 1, j, k - 1)], cellVertex[cellIdx(i, j, k - 1)],
            cellVertex[cellIdx(i, j, k)], cellVertex[cellIdx(i - 1, j, k)], !here);
        }
        if (k + 1 < nz && i > 0 && j > 0 && (field[idx(i, j, k + 1)] >= level) !== here) {
          quad(cellVertex[cellIdx(i - 1, j - 1, k)], cellVertex[cellIdx(i, j - 1, k)],
            cellVertex[cellIdx(i, j, k)], cellVertex[cellIdx(i - 1, j, k)], here);
        }
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position',
    new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(tris);
  geometry.computeVertexNormals();
  return {
    geometry,
    vertices: positions.length / 3,
    triangles: tris.length / 3,
    samples: nx * ny * nz,
    grid: [nx, ny, nz],
  };
}
