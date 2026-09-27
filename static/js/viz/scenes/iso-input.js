// What you run marching cubes ON, which matters more than which method.
//
// The staircase people blame the algorithm for comes from the input. A 0/1
// mask has nothing between 0 and 1, so the threshold at 0.5 is crossed exactly
// halfway along every edge that crosses it, and the vertices land on a lattice.
// Any method does that; it is the data, not the table.
//
// The three inputs here are the three things people actually have:
//
//   mask        what a threshold or a hand annotation gives you
//   blurred     the usual fix, and it moves the surface: a Gaussian pulls a
//               thin branch under the threshold before it does much to the
//               trunk, so fine structures erode and the volume falls
//   coverage    the fraction of each voxel that is inside - what a probability
//               map from a classifier is, and what partial volume gives you at
//               a real edge. Sub-voxel by construction, so it is smooth AND
//               the right size, with nothing applied to it
//
// A signed distance field is the other answer people reach for and it is NOT
// here, because on a mask it is a no-op. Marching cubes only interpolates
// along grid edges; an edge crossing the surface runs from a voxel one step
// inside to one step outside, so the field reads +1 and -1 whatever the
// distance transform did further away, and the crossing lands at the midpoint.
// Identical vertices to the binary mask, exactly. Smoothing the field first
// does change it - it erodes thin structures faster than blurring the mask,
// because outside a thin plate the field runs to minus several voxels while
// the inside only ever reaches about one.
//
// The enclosed-volume readout is the argument. Smooth and accurate are
// different things, and the blurred surface is only the first one.

import { defineScene, THREE, palette } from '../runtime.js';
import * as snowflake from '../snowflake.js';
import { extract } from '../isosurface.js';

// The plates are 0.055 thick, so anything under about 70 samples across puts
// them below two voxels and the dual method rounds them away on its own -
// which would show up in the readout as if the input had done it.
const RES = 80;
const BOUNDS = snowflake.BOUNDS;
const SUB = 3;       // subsamples per axis when measuring coverage

// ------------------------------------------------------------------- the grid

/** The sampling `extract` will use, worked out once so the fields line up. */
function gridFor(res) {
  const step = (2 * BOUNDS.x) / res;
  return {
    step,
    nx: res + 1,
    ny: Math.max(2, Math.round((2 * BOUNDS.y) / step)) + 1,
    nz: Math.max(2, Math.round((2 * BOUNDS.z) / step)) + 1,
  };
}

/** Occupancy: 1 inside the specimen, 0 outside. */
function occupancy({ step, nx, ny, nz }) {
  const field = new Float32Array(nx * ny * nz);
  for (let k = 0; k < nz; k++) {
    const z = -BOUNDS.z + k * step;
    for (let j = 0; j < ny; j++) {
      const y = -BOUNDS.y + j * step;
      for (let i = 0; i < nx; i++) {
        const x = -BOUNDS.x + i * step;
        field[(k * ny + j) * nx + i] = snowflake.isInside(x, y, z) ? 1 : 0;
      }
    }
  }
  return field;
}

/**
 * The fraction of each voxel that is inside, by supersampling.
 *
 * Only on the boundary. Interior and exterior voxels are already 0 or 1, and
 * supersampling the whole grid would be 27 inside-tests per voxel over a
 * hundred-odd parts - seconds of work for values that cannot change.
 */
function coverage(occ, { step, nx, ny, nz }) {
  const field = occ.slice();
  const at = (i, j, k) => occ[(k * ny + j) * nx + i];
  const offset = (step / SUB) * ((SUB - 1) / 2);

  for (let k = 1; k < nz - 1; k++) {
    for (let j = 1; j < ny - 1; j++) {
      for (let i = 1; i < nx - 1; i++) {
        const here = at(i, j, k);
        // Six-neighbourhood: a voxel with a differing face neighbour is one
        // the surface passes through.
        if (here === at(i - 1, j, k) && here === at(i + 1, j, k)
          && here === at(i, j - 1, k) && here === at(i, j + 1, k)
          && here === at(i, j, k - 1) && here === at(i, j, k + 1)) continue;

        const x0 = -BOUNDS.x + i * step - offset;
        const y0 = -BOUNDS.y + j * step - offset;
        const z0 = -BOUNDS.z + k * step - offset;
        let inside = 0;
        for (let c = 0; c < SUB; c++) {
          for (let b = 0; b < SUB; b++) {
            for (let a = 0; a < SUB; a++) {
              if (snowflake.isInside(x0 + a * step / SUB,
                y0 + b * step / SUB,
                z0 + c * step / SUB)) inside++;
            }
          }
        }
        field[(k * ny + j) * nx + i] = inside / (SUB * SUB * SUB);
      }
    }
  }
  return field;
}

// -------------------------------------------------------------------- the blur

/** One pass of a separable Gaussian along a stride. Edges clamp. */
function blurAxis(src, dst, n, count, stride, base, kernel) {
  const radius = (kernel.length - 1) / 2;
  for (let c = 0; c < count; c++) {
    const start = base(c);
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let t = -radius; t <= radius; t++) {
        const s = Math.min(n - 1, Math.max(0, i + t));
        sum += src[start + s * stride] * kernel[t + radius];
      }
      dst[start + i * stride] = sum;
    }
  }
}

function gaussian(field, { nx, ny, nz }, sigma) {
  if (sigma <= 0) return field.slice();
  const radius = Math.max(1, Math.ceil(sigma * 3));
  const kernel = new Float32Array(2 * radius + 1);
  let total = 0;
  for (let t = -radius; t <= radius; t++) {
    const w = Math.exp(-(t * t) / (2 * sigma * sigma));
    kernel[t + radius] = w;
    total += w;
  }
  for (let t = 0; t < kernel.length; t++) kernel[t] /= total;

  let a = field.slice();
  let b = new Float32Array(a.length);
  blurAxis(a, b, nx, ny * nz, 1, (c) => c * nx, kernel);
  [a, b] = [b, a];
  blurAxis(a, b, ny, nx * nz, nx,
    (c) => Math.floor(c / nx) * nx * ny + (c % nx), kernel);
  [a, b] = [b, a];
  blurAxis(a, b, nz, nx * ny, nx * ny, (c) => c, kernel);
  return b;
}

// --------------------------------------------------------------- measurements

/** Enclosed volume, as the signed tetrahedra the triangles make with 0. */
function enclosedVolume(geometry) {
  const pos = geometry.getAttribute('position');
  const index = geometry.getIndex();
  if (!index) return 0;
  let total = 0;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (let i = 0; i < index.count; i += 3) {
    a.fromBufferAttribute(pos, index.getX(i));
    b.fromBufferAttribute(pos, index.getX(i + 1));
    c.fromBufferAttribute(pos, index.getX(i + 2));
    total += a.dot(b.clone().cross(c)) / 6;
  }
  return Math.abs(total);
}

// ---------------------------------------------------------------- the scene

defineScene('iso-input', ({ scene, ui, view }) => {
  view(1.5, 2.6, 2.1, 1.16);

  const dims = gridFor(RES);
  const occ = occupancy(dims);
  const cov = coverage(occ, dims);

  let mode = 0;                 // 0 mask, 1 blurred, 2 coverage
  let sigma = 1.0;

  const surface = new THREE.Mesh(undefined, new THREE.MeshPhysicalMaterial({
    color: palette.ice, roughness: 0.22, metalness: 0.02,
    clearcoat: 0.8, clearcoatRoughness: 0.2,
    side: THREE.DoubleSide, flatShading: false,
  }));
  scene.add(surface);

  const report = ui.readout('Enclosed volume');
  const say = ui.note();

  /** Nearest-sample lookup, on the grid `extract` is about to walk. */
  function samplerFor(field) {
    const { step, nx, ny, nz } = dims;
    return (x, y, z) => {
      const i = Math.min(nx - 1, Math.max(0, Math.round((x + BOUNDS.x) / step)));
      const j = Math.min(ny - 1, Math.max(0, Math.round((y + BOUNDS.y) / step)));
      const k = Math.min(nz - 1, Math.max(0, Math.round((z + BOUNDS.z) / step)));
      return field[(k * ny + j) * nx + i];
    };
  }

  function build(field) {
    return extract({
      sample: samplerFor(field), bounds: BOUNDS, level: 0.5, res: RES,
    });
  }

  // The baseline is the mask, because that is what people start from and the
  // question on this slide is what each alternative does to it.
  //
  // The coverage field's own integral looks like a better ground truth and is
  // not, at least not for this readout: a dual method rounds corners, so every
  // extracted surface sits a few percent under the field it came from, and
  // comparing against the integral folds that bias into a number the slide is
  // using to talk about the input. Like against like.
  const baseline = enclosedVolume(build(occ).geometry);

  function rebuild() {
    surface.geometry?.dispose();

    const field = [occ, gaussian(occ, dims, sigma), cov][mode];
    const out = build(field);
    surface.geometry = out.geometry;

    const volume = enclosedVolume(out.geometry);
    const drift = 100 * (volume / baseline - 1);
    report(`${volume.toFixed(3)} `
      + `(${drift >= 0 ? '+' : ''}${drift.toFixed(0)}% vs the mask)`);

    say([
      'Every vertex sits halfway along a grid edge, so the surface is a lattice - and every boundary voxel is rounded all the way in or all the way out.',
      'Smooth, and much smaller: the blur pulls thin branches under the threshold before it touches the trunk.',
      'Smooth, with nothing applied to it - and a few percent under the mask because it is not rounding boundary voxels outwards.',
    ][mode]);
  }

  ui.choice('Extract from', ['Binary mask', 'Blurred mask', 'Coverage map'],
    (i) => { mode = i; rebuild(); });

  ui.slider('Blur the mask', {
    min: 0, max: 2.5, step: 0.1, value: sigma,
    format: (v) => (v === 0 ? 'none' : `sigma ${v.toFixed(1)}`),
  }, (v) => { sigma = v; rebuild(); });
});
