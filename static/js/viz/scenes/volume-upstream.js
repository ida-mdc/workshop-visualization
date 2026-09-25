// The same block of numbers three times: as acquired, denoised, segmented.
//
// Three volumes side by side and one drag turns all three. Turning them
// together is what shows that the middle panel is the left one with the noise
// taken out: the same nuclei sit in the same places.
//
// The specimen is a Tribolium castaneum embryo imaged at deliberately low
// laser power, from the CARE example data. It is here because it is
// violently noisy: a well-exposed stack denoises into something that looks
// almost identical, and then the slide has nothing to show. Cropped and not
// downsampled, because box-averaging a noisy volume IS denoising and a left
// panel that had been quietly cleaned up first would be a lie.
//
// Denoised by UniFMIR, a pretrained model from the BioImage Model Zoo that was
// fine-tuned on this exact dataset - inference only, nothing trained here.
// Segmented by Cellpose 3's nuclei model in 3D, run on the denoised volume.
//
// Cellpose's own denoiser was here first and barely moved off the noise: the
// segmentation that followed found 26 objects where this one finds 175. See
// tools/make-upstream-volumes.py, which also records what StarDist does on the
// noisy volume directly, which is find two things.

import {
  defineScene, THREE, panelStrip, spreadPanels, panelOrbit,
} from '../runtime.js';
import { makeVolume, MODES } from '../volume.js';

const SHAPE = [120, 120, 45];

// Half-extents. z is short because the stack is short, and it carries the
// measured z step with it - the nuclei are balls, so anything else renders
// them as lozenges.
const BOUNDS = [0.5, 0.5, 0.2344];

const FILES = {
  noisy: 'upstream-noisy-120x120x45.raw',
  denoised: 'upstream-denoised-120x120x45.raw',
  labels: 'upstream-labels-120x120x45.raw',
};

// Cool through to white, which is what fluorescence looks like on a dark
// strip and what the two intensity panels want.
const SIGNAL = ['#050810', '#123252', '#3f7fb5', '#a8cbe8', '#ffffff'];

// One mid-tone per object. Mid-tone rather than bright, so that thirty
// labels next to two grey-blue panels do not turn the slide into confetti.
const LABEL_COLORS = [
  '#4d8fc4', '#e08b3a', '#57a97a', '#b05f97', '#d2ab35',
  '#6b77cc', '#d9705a', '#37998f', '#9b7d6a', '#89a044',
];

/**
 * A lookup table with one entry per object.
 *
 * A ramp cannot express this: object 7 is not a shade between object 6 and
 * object 8, it is a different thing that happens to have been counted
 * seventh. Entry 0 is the background and is fully transparent.
 */
function labelLUT(opacity) {
  const data = new Uint8Array(256 * 4);
  for (let i = 1; i < 256; i++) {
    const hex = LABEL_COLORS[(i - 1) % LABEL_COLORS.length].slice(1);
    // Every tenth object would otherwise be the same color as the one ten
    // before it. A deterministic wobble keeps neighbours apart without
    // needing a palette of two hundred and fifty-five.
    const jitter = 0.78 + 0.44 * (((i * 2654435761) >>> 8) % 1000) / 1000;
    for (let c = 0; c < 3; c++) {
      const v = parseInt(hex.slice(c * 2, c * 2 + 2), 16) * jitter;
      data[i * 4 + c] = Math.max(0, Math.min(255, Math.round(v)));
    }
    data[i * 4 + 3] = Math.round(opacity * 255);
  }
  return data;
}

function load(file, expected) {
  // Three levels up, not two: this file is in scenes/, one deeper than
  // scan.js, which is where the two-level version was copied from.
  const url = new URL(`../../../data/${file}`, import.meta.url);
  return fetch(url)
    .then((r) => {
      if (!r.ok) throw new Error(`${url}: ${r.status}`);
      return r.arrayBuffer();
    })
    .then((buffer) => {
      const data = new Uint8Array(buffer);
      if (data.length !== expected) {
        throw new Error(`${file} is ${data.length} bytes, expected ${expected}`);
      }
      return data;
    });
}

defineScene('volume-upstream', (ctx) => {
  const { scene, projection, frustum, view, controls } = ctx;
  const camera = projection('orthographic');
  frustum(1.15, 3.5);
  view(0, 0, 3.4);
  controls.enabled = false;
  for (let i = 1; i <= 3; i++) camera.layers.enable(i);

  // Dark, like the other two rows of volume renderings in this session.
  // Fluorescence on white is a photograph of a lamp.
  ctx.el.style.background = '#101319';

  panelStrip(ctx.el, ['as acquired', 'denoised', 'segmented'],
    { numbered: false });

  const panels = [];
  const [nx, ny, nz] = SHAPE;
  const bytes = nx * ny * nz;

  Promise.all([
    load(FILES.noisy, bytes),
    load(FILES.denoised, bytes),
    load(FILES.labels, bytes),
  ]).then(([noisy, denoised, labels]) => {
    const common = {
      shape: SHAPE,
      bounds: BOUNDS,
      steps: 180,
      // Nearest for all three, and not only for the labels. The two
      // intensity panels are a comparison, and interpolation is a blur -
      // letting the renderer smooth the noisy one would be doing the
      // denoiser's job for it in the one panel that must not have had it
      // done.
      interpolate: false,
      mode: MODES['Emission-absorption'],
    };

    const built = [
      {
        data: noisy,
        opts: {
          ...common,
          stops: SIGNAL,
          // Opens low and climbs fast. The signal here is barely above the
          // noise, so a gentle ramp starting above it would quietly throw
          // the noise away - which is the one thing this panel must not do.
          threshold: 0.30,
          width: 0.09,
          density: 0.09,
          curve: 1,
          shade: 0,
        },
      },
      {
        data: denoised,
        opts: {
          ...common,
          stops: SIGNAL,
          // Identical to the panel on its left. Any difference here would
          // be a difference between two transfer functions rather than
          // between two volumes.
          threshold: 0.30,
          width: 0.09,
          density: 0.09,
          curve: 1,
          shade: 0,
        },
      },
      {
        data: labels,
        opts: {
          ...common,
          stops: SIGNAL,
          lut: labelLUT(0.28),
          // Objects are solid things, so these get lit. The gradient of a
          // label field is a staircase at the object's edge, which is
          // exactly where the light should be.
          shade: 1,
          ambient: 0.4,
        },
      },
    ];

    built.forEach(({ data, opts }, i) => {
      const panel = new THREE.Group();
      scene.add(panel);
      panels.push(panel);
      const volume = makeVolume(panel, opts);
      volume.update(data);
      panel.traverse((o) => o.layers.set(i + 1));
    });
  }).catch((err) => console.error('viz3d: volume-upstream', err));

  const orbit = panelOrbit(ctx, panels);

  return {
    tick: () => {
      spreadPanels(camera, panels);
      orbit();
    },
  };
});
