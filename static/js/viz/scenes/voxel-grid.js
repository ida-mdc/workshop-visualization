// Voxels: a filled block of numbers.
//
// The overview deck's data-type slide, on the procedural flower. Its mesh,
// point-cloud and vector-field neighbours use the same specimen, so the four
// slides are four representations of one thing.
//
// The voxels session opens on the real frog scan, in voxel-cubes.js. Keep
// them apart: this scene belongs beside the flower.
//
// Three things, and no more than three - this is the slide that introduces
// the data type, not the one about transfer functions.
//
//   A volume is a BLOCK. The wireframe box is the acquisition, and every
//   position in it holds a number, including the empty ones.
//
//   Resolution is a SAMPLING choice: coarsen it and the stamens go first,
//   then the stem.
//
//   Spacing is METADATA. A volume sampled coarsely in y is wrong on screen
//   until you tell the viewer about it.
//
// Coarse in y rather than in z, because y is the axis the specimen is scanned
// along: a microscope collects a stack of slices from the top of the flower
// down through it, and the gap between two slices is larger than the pixel
// size within one. So the squashing, when the spacing is ignored, is the
// flower losing its height - which is the failure people actually meet.
//
// Solid voxels rather than a soft ramp, so cutting into the block shows a
// cut face rather than a haze - and so the color is doing one job, which
// is depth into the specimen.

import { defineScene, THREE, ramp, clearGroup } from '../runtime.js';
import * as shape from '../shape.js';
import {
  bucketedVoxels, acquisitionBox, opacityRamp, MIN_ALPHA,
} from '../voxels.js';

const B = shape.BOUNDS;

// Sequential and monotonic in lightness, so it still reads in greyscale and
// to a color-blind viewer - but through more than one hue, because the
// point of the cut-away is to see structure on the cut face and a
// single-hue ramp gives it almost nothing to show.
const VALUE = ['#fde3a7', '#e8894b', '#b83d6b', '#5c2a6e', '#1b1b45'];

defineScene('voxel-grid', ({ scene, ui, view }) => {
  view(...shape.DETAIL_VIEW, shape.DETAIL_RADIUS);

  let grid = 52;           // samples across x
  let yMode = 0;           // 0 isotropic, 1 coarse in y, 2 coarse and ignored
  let cut = B.x;

  const drawn = new THREE.Group();
  scene.add(drawn);
  let box = null;

  // In or out, at one fixed level. A transfer function with a ramp in it is
  // the next slide's subject; here a voxel either holds specimen or it does
  // not, which is all this one needs.
  const THRESHOLD = 0.24;
  const alphaFor = (v) => opacityRamp(v, THRESHOLD, 0);

  function clear() {
    clearGroup(drawn);
    if (box) {
      scene.remove(box);
      box.geometry.dispose();
      box.material.dispose();
      box = null;
    }
  }

  function rebuild() {
    clear();

    // One spacing across x and z; y is the axis that gets undersampled,
    // because it is the one the slices are stacked along.
    const yFactor = yMode === 0 ? 1 : 3;
    const respect = yMode !== 2;
    const step = (2 * B.x) / grid;
    const yStep = step * yFactor;
    const ny = Math.max(1, Math.round((2 * B.y) / yStep));
    const nz = Math.max(1, Math.round((2 * B.z) / step));

    // A voxel is a box of the physical size it was sampled at. Ignoring the
    // spacing means drawing it as a cube anyway, which slides every sample
    // towards the origin along y - the classic squashed volume, here a
    // flower flattened into its own petals.
    const height = respect ? yStep : step;
    const yScale = respect ? 1 : 1 / yFactor;

    const samples = [];
    for (let i = 0; i < grid; i++) {
      const x = -B.x + (i + 0.5) * step;
      if (x > cut) continue;
      for (let j = 0; j < ny; j++) {
        const y = -B.y + (j + 0.5) * yStep;
        for (let k = 0; k < nz; k++) {
          const z = -B.z + (k + 0.5) * step;
          const v = shape.sampleVolume(x, y, z);
          const a = alphaFor(v);
          if (a < MIN_ALPHA) continue;
          samples.push(x, y * yScale, z, v, a);
        }
      }
    }

    drawn.add(bucketedVoxels({
      samples,
      size: { x: step, y: height, z: step },
      // Color is the value itself, never the value relative to the
      // threshold: moving the threshold changes what is shown, never what a
      // shade means.
      colorFor: (v) => ramp(VALUE, v),
    }));

    // The acquisition. Drawn at full extent even when part of it is cut away,
    // because the block is what was recorded either way.
    box = acquisitionBox(B, { x: 1, y: yScale, z: 1 });
    scene.add(box);

    report(`${grid}×${ny}×${nz}`);
  }

  // At the top of the resolution slider a rebuild samples 1.6 million points
  // through the exact geometry, which is about 0.4 s - fine as a destination,
  // far too slow to run once per `input` event while the slider is dragged.
  // Coalescing to one rebuild per frame keeps the drag responsive and means
  // the queue can never grow behind it.
  let queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; rebuild(); });
  }

  // The sample count is a readout rather than the slider's own label, because
  // it depends on the y spacing as well as on the slider - coarsening y is
  // exactly the case where the number of samples along one axis drops, and a
  // format function on the slider would only notice when the slider moved.
  const report = ui.readout('Samples');

  ui.slider('Resolution', {
    min: 10, max: 128, step: 2, value: grid,
    format: (v) => `${v} across`,
  }, (v) => { grid = v; schedule(); });

  ui.slider('Cut away', {
    min: -B.x, max: B.x, step: 0.01, value: B.x,
    format: (v) => (v >= B.x ? 'none'
      : `${Math.round((1 - (v + B.x) / (2 * B.x)) * 100)}%`),
  }, (v) => { cut = v; schedule(); });

  ui.choice('y spacing', ['Isotropic', '3× coarser', 'Coarser, not declared'],
    (i) => { yMode = i; schedule(); });

});
