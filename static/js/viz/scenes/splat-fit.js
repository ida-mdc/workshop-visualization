// A volume, and the same volume as a few thousand blobs.
//
// The idea behind luxar (Royer lab): do not ship the voxels at all. Fit the
// intensity field with a sparse set of oriented Gaussians, ship those, and
// let the browser draw them as splats. A volume is a number at every position
// including all the empty ones; a fit only spends parameters where there is
// something to describe, so an empty box costs nothing.
//
// Their published example is a Tribolium embryo: 965 x 1871 x 991 voxels,
// 3.6 GB as a TIFF, fitted with 296,559 splats and stored in 2.0 MB. Across a
// 17-volume benchmark they report 6x to 340x compression at 26-67 dB PSNR.
//
// Here the same thing on the frog, at whatever detail the slider asks for.
// The splats are built as a ladder of levels, coarse to fine, which is how
// luxar stores them too: each level is a complete fit at its own scale, so a
// viewer can show a coarse one immediately and swap in a finer one when the
// object gets big on screen.
//
// Two simplifications worth saying out loud:
//
//   The blobs here are ROUND and OPAQUE. Real Gaussian splats are oriented -
//   an ellipsoid with its own covariance - and translucent, composited front
//   to back, which is what lets a few of them describe a smooth gradient.
//   Round opaque ones are sort-independent and read clearly on a projector.
//
//   The fit is a GRID AVERAGE, not an optimisation. luxar runs gradient
//   descent in PyTorch on position, covariance, color and opacity, and
//   picks the splat count by blind-spot cross-validation. Averaging over
//   cells gets the same shape of answer for a slide, in a few milliseconds.
//
// So the picture is honest about what you gain and what you lose: at the
// coarse end it is clearly an approximation, and you can see which parts of
// the animal it gives up on first.

import { defineScene, THREE, ramp } from '../runtime.js';
import {
  loadScan, makeSampler, SHAPE, BOUNDS, BANDS, RAMP, SPREAD, shade,
} from '../scan.js';
import { makeVolume, MODES } from '../volume.js';

/** Cells across x, per level of the ladder. Coarse to fine. */
const GRIDS = [5, 8, 13, 20, 28, 38];

/** Never draw more than this, however fine the grid gets. */
const CAP = 9000;

// luxar's own ratio: 296,559 splats in 2.0 MB, quantised on disk. A splat is
// a position, a covariance, a color and an opacity; stored as float32 it
// would be four times this.
const BYTES_PER_SPLAT = 7;

/** The volume it is being compared against - the frog, as uint8. */
const VOXEL_BYTES = SHAPE[0] * SHAPE[1] * SHAPE[2];

/** Samples per axis taken inside one cell when fitting it. */
const SUB = 3;

function human(bytes) {
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  if (bytes >= 1e3) return `${Math.round(bytes / 1e3)} kB`;
  return `${bytes} B`;
}

/**
 * Fit one level: a splat per cell that has something in it.
 *
 * The centre is the intensity-weighted centroid of the samples rather than
 * the middle of the cell, so the blobs follow the specimen instead of the
 * lattice - which is the difference between a fit and a downsample, and it
 * shows at the coarse end.
 */
function fitLevel(sample, grid) {
  const cell = (2 * BOUNDS[0]) / grid;
  const nx = grid;
  const ny = Math.max(1, Math.round((2 * BOUNDS[1]) / cell));
  const nz = Math.max(1, Math.round((2 * BOUNDS[2]) / cell));
  const splats = [];

  for (let k = 0; k < nz; k++) {
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const x0 = -BOUNDS[0] + i * cell;
        const y0 = -BOUNDS[1] + j * cell;
        const z0 = -BOUNDS[2] + k * cell;

        let weight = 0;
        let cx = 0;
        let cy = 0;
        let cz = 0;
        let peak = 0;
        for (let c = 0; c < SUB; c++) {
          const z = z0 + ((c + 0.5) / SUB) * cell;
          for (let b = 0; b < SUB; b++) {
            const y = y0 + ((b + 0.5) / SUB) * cell;
            for (let a = 0; a < SUB; a++) {
              const x = x0 + ((a + 0.5) / SUB) * cell;
              const v = sample(x, y, z);
              if (v > peak) peak = v;
              weight += v;
              cx += v * x;
              cy += v * y;
              cz += v * z;
            }
          }
        }
        const mean = weight / (SUB * SUB * SUB);
        // Skin is where the animal starts. Below it the cell is air, and a
        // fit that put a splat there would be describing the noise.
        if (mean < BANDS.skin) continue;

        splats.push({
          x: cx / weight,
          y: cy / weight,
          z: cz / weight,
          // A fuller cell gets a fatter blob. Enough variation that the
          // surface does not read as a lattice, not so much that the thin
          // parts of the animal disappear inside their own splats.
          r: cell * (0.40 + 0.28 * Math.min(1, mean / BANDS.tissue)),
          // Halfway between the average and the brightest thing in the cell.
          // The peak alone saturates as soon as a cell touches bone and every
          // splat comes out the same color; the average alone drags the whole
          // animal into the bottom of the ramp.
          v: shade(0.5 * (mean + peak)),
          mean,
        });
      }
    }
  }

  // Ordered by how much is in the cell, then cut. Which is the crude version
  // of what a real fitter does when you give it a splat budget: spend it on
  // the parts of the field that carry the signal.
  splats.sort((a, b) => b.mean - a.mean);
  return splats.length > CAP ? splats.slice(0, CAP) : splats;
}

defineScene('splat-fit', ({ scene, ui, view }) => {
  // The frog's back, nose up - the view every other slide in this session
  // shows it from.
  view(0.85, 0.45, 2.6, 0.62);

  const stage = new THREE.Group();
  stage.rotation.x = Math.PI / 2;
  scene.add(stage);

  const blobs = new THREE.Group();
  stage.add(blobs);

  let sample = null;
  let volume = null;
  let level = 4;
  let showSplats = true;

  const levels = new Array(GRIDS.length).fill(null);
  const report = ui.readout('On disk');

  function rebuild() {
    if (!sample) return;

    for (const child of blobs.children) {
      child.geometry.dispose();
      child.material.dispose();
    }
    blobs.clear();

    const splats = levels[level];

    // One instanced mesh for the lot. A splat is small on screen, so an
    // icosahedron is as round as anything with a sphere's triangle count.
    const mesh = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(1, 1),
      new THREE.MeshStandardMaterial({ roughness: 0.52, metalness: 0 }),
      splats.length,
    );
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const pos = new THREE.Vector3();
    const scl = new THREE.Vector3();
    splats.forEach((s, n) => {
      pos.set(s.x, s.y, s.z);
      scl.set(s.r, s.r, s.r);
      m.compose(pos, q, scl);
      mesh.setMatrixAt(n, m);
      mesh.setColorAt(n, ramp(RAMP, s.v));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    blobs.add(mesh);

    blobs.visible = showSplats;
    if (volume) volume.mesh.visible = !showSplats;

    const bytes = splats.length * BYTES_PER_SPLAT;
    report(`${human(bytes)} of splats · ${human(VOXEL_BYTES)} of voxels`
      + ` · ${Math.round(VOXEL_BYTES / bytes)}× smaller`);
  }

  const detail = ui.slider('Detail', {
    min: 0, max: GRIDS.length - 1, step: 1, value: level,
    format: (v) => (levels[v]
      ? `${levels[v].length.toLocaleString('en')} splats`
      : `${GRIDS[v]} across`),
  }, (v) => { level = v; rebuild(); });

  ui.choice('Show', ['The fit', 'The voxels it was fitted to'], (i) => {
    showSplats = i === 0;
    blobs.visible = showSplats;
    if (volume) volume.mesh.visible = !showSplats;
  });

  loadScan().then((texture) => {
    sample = makeSampler(texture.image.data);
    // All six levels at once. The whole ladder is under two million
    // trilinear reads, which is cheaper than the surprise of a slider that
    // stalls the first time it reaches a level nobody has visited.
    for (let i = 0; i < GRIDS.length; i++) levels[i] = fitLevel(sample, GRIDS[i]);

    volume = makeVolume(stage, {
      shape: SHAPE,
      bounds: BOUNDS,
      stops: RAMP,
      texture,
      threshold: BANDS.skin + 0.02,
      width: 0.06,
      density: 0.12,
      curve: 1,
      window: SPREAD,
      steps: 180,
      shade: 0.7,
      ambient: 0.3,
      mode: MODES['Emission-absorption'],
    });
    volume.mesh.visible = !showSplats;

    // The slider's readout was written before the levels existed, so it is
    // still showing a grid size. Re-running it draws the scene as well.
    detail.set(level);
  });
});
