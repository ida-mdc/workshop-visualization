// Volume rendering: four ways to turn a block of numbers into a picture.
//
// This is a real ray marcher, not four pictures of four objects. One 3D
// texture of the specimen is uploaded once, and each mode is a different
// decision about what to do with the samples a ray collects as it crosses
// it - see MODES in ../volume.js, which is where the shader lives and which
// the acquisition scenes share.
//
// The threshold slider is the transfer function's opacity ramp. That one
// control is what decides what the picture shows, in every mode - which is
// the point of the slide.

import { defineScene } from '../runtime.js';
import * as shape from '../shape.js';
import { makeVolume, MODES } from '../volume.js';

const SIZE = { x: 96, y: 76, z: 96 };

const MAPS = {
  Tissue: ['#1b1b2e', '#7d3350', '#d8734f', '#f6d9a8', '#ffffff'],
  Ice: ['#07203a', '#2c5f86', '#7fb4d8', '#e8f4fb'],
  Viridis: ['#440154', '#414487', '#2a788e', '#22a884', '#7ad151', '#fde725'],
  Grey: ['#0a0a0a', '#ffffff'],
};

/** Sample the specimen onto the grid, once. */
function sampleSpecimen() {
  const { x: nx, y: ny, z: nz } = SIZE;
  const data = new Uint8Array(nx * ny * nz);
  const B = shape.BOUNDS;
  let n = 0;
  for (let k = 0; k < nz; k++) {
    const z = -B.z + ((k + 0.5) / nz) * 2 * B.z;
    for (let j = 0; j < ny; j++) {
      const y = -B.y + ((j + 0.5) / ny) * 2 * B.y;
      for (let i = 0; i < nx; i++) {
        const x = -B.x + ((i + 0.5) / nx) * 2 * B.x;
        data[n++] = Math.round(255 * Math.min(1, shape.sampleVolume(x, y, z)));
      }
    }
  }
  return data;
}

defineScene('volume-rendering', ({ scene, ui, view, THREE }) => {
  const B = shape.BOUNDS;
  view(2.9, 1.4, 3.4, 1.55);

  let map = 'Tissue';
  let threshold = 0.34;
  let density = 0.55;

  const volume = makeVolume(scene, {
    shape: [SIZE.x, SIZE.y, SIZE.z],
    bounds: [B.x, B.y, B.z],
    stops: MAPS[map],
    threshold,
    density,
    // A wider shoulder and a straight curve: the acquisition scenes want a
    // faint background held back, this one wants the threshold slider to
    // read as one clean level the whole ramp pivots around.
    width: 0.09,
    curve: 1,
    steps: 160,
    // Unlit. Gradient shading is what makes the acquisition panels read as
    // objects, and here it would confound the comparison - the difference
    // between the four modes has to be the only thing changing.
    shade: 0,
    mode: MODES['Emission-absorption'],
  });
  volume.update(sampleSpecimen());

  // The acquisition, so the block it all lives in stays visible.
  scene.add(new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(2 * B.x, 2 * B.y, 2 * B.z)),
    new THREE.LineBasicMaterial({
      color: '#9aa7b4', transparent: true, opacity: 0.4,
    }),
  ));

  const retune = () => volume.retune({ stops: MAPS[map], threshold, density });
  retune();

  ui.choice('Mode', Object.keys(MODES), (_, name) => {
    volume.setMode(MODES[name]);
  }, MODES['Emission-absorption']);

  ui.slider('Threshold', {
    min: 0.05, max: 0.85, step: 0.01, value: threshold,
    format: (v) => v.toFixed(2),
  }, (v) => { threshold = v; retune(); });

  ui.slider('Density', {
    min: 0.05, max: 1.0, step: 0.05, value: density,
    format: (v) => v.toFixed(2),
  }, (v) => { density = v; retune(); });

  ui.slider('Slice', {
    min: -0.49, max: 0.49, step: 0.01, value: 0,
    format: (v) => `${Math.round((v + 0.5) * 100)}%`,
  }, (v) => { volume.uniforms.slice.value = v; });

  ui.choice('Colormap', Object.keys(MAPS), (_, name) => {
    map = name;
    retune();
  });
});
