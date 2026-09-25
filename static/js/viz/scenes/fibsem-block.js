// A block of cell with no background in it.
//
// FIB-SEM of a mouse beta cell: resin-embedded, stained, every voxel sample.
// The threshold is a hard step, not a transfer function - drag it and the
// block only erodes, because nothing in it is not cell.

import { defineScene, THREE, ramp } from '../runtime.js';
import { makeVolume, MODES } from '../volume.js';

const SHAPE = [160, 160, 160];
const BOUNDS = [0.5, 0.5, 0.5];
const FILE = 'fibsem-160x160x160.raw';

// Bright: this renders over a white slide, and the block was reading as a
// dark lump at the low end.
const STOPS = ['#5a636e', '#8993a0', '#b3bcc6', '#dae0e6', '#ffffff'];

/** Value picks the grey; alpha is flat above the cut and zero below it. */
function stepLUT(threshold, alpha) {
  const data = new Uint8Array(256 * 4);
  const cut = Math.round(threshold * 255);
  for (let i = 0; i < 256; i++) {
    const c = ramp(STOPS, i / 255);
    data[i * 4] = Math.round(c.r * 255);
    data[i * 4 + 1] = Math.round(c.g * 255);
    data[i * 4 + 2] = Math.round(c.b * 255);
    data[i * 4 + 3] = i >= cut ? Math.round(alpha * 255) : 0;
  }
  return data;
}

defineScene('fibsem-block', ({ scene, ui, view, el }) => {
  view(2.0, 1.3, 2.1, 0.92);
  el.style.background = '#ffffff';

  let volume = null;
  let hist = null;
  let total = 0;
  let threshold = 0;
  const report = ui.readout('Kept');

  function apply() {
    if (!volume) return;
    volume.uniforms.transfer.value.image.data.set(stepLUT(threshold, 0.55));
    volume.uniforms.transfer.value.needsUpdate = true;
    let n = 0;
    for (let v = Math.round(threshold * 255); v < 256; v++) n += hist[v];
    report(`${((n / total) * 100).toFixed(1)}% of voxels`);
  }

  ui.slider('Threshold', {
    min: 0, max: 0.9, step: 0.005, value: 0, format: (v) => v.toFixed(2),
  }, (v) => { threshold = v; apply(); });

  fetch(new URL(`../../../data/${FILE}`, import.meta.url))
    .then((r) => r.arrayBuffer())
    .then((buf) => {
      const data = new Uint8Array(buf);
      hist = new Float64Array(256);
      for (let i = 0; i < data.length; i++) hist[data[i]]++;
      total = data.length;

      volume = makeVolume(scene, {
        shape: SHAPE,
        bounds: BOUNDS,
        stops: STOPS,
        lut: stepLUT(0, 0.55),
        steps: 260,
        // Unlit: a near-uniform block has no gradient to light it by, and
        // shading one renders it black.
        shade: 0,
        ambient: 1,
        mode: MODES['Emission-absorption'],
      });
      volume.update(data);

      scene.add(new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
        new THREE.LineBasicMaterial({ color: '#b9bfc8' }),
      ));
      apply();
    })
    .catch((err) => console.error('fibsem-block:', err));
});
