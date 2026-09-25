// One dataset, four renderings, side by side.
//
// The four modes used to be a toggle, which meant the room had to hold the
// previous picture in memory to compare it with the current one. Side by side
// the comparison is the illustration, and the only thing that differs between
// the panels is what happens to the samples a ray collects - same volume,
// same texture, same transfer function, same threshold.
//
// One threshold, fixed, for all four - the slide is the comparison, not a
// control panel, and the text under it says what each mode does. Drag to turn
// all four together.
//
// Under each panel is the same thing again in one dimension: the intensity a
// single ray actually meets crossing the frog, and what the mode does with
// it. That profile is read out of the volume, not drawn by hand - air, skin,
// the stained soft tissue, a bone, and out the other side - so the four
// little plots and the four big pictures are two views of one operation.

import {
  defineScene, THREE, panelStrip, panelPlots, spreadPanels, panelOrbit,
} from '../runtime.js';
import { makeVolume, MODES } from '../volume.js';
import { loadScan, SHAPE, BOUNDS, BANDS, WINDOW } from '../scan.js';

// Keyed by the names MODES uses, so the shader a panel gets is looked up by
// this same string. What the strip prints comes from LABELS.
const ORDER = ['Slice', 'MIP', 'Emission-absorption', 'Isosurface'];

const LABELS = {
  Slice: 'slice',
  MIP: 'maximum intensity projection',
  'Emission-absorption': 'emission-absorption',
  Isosurface: 'isosurface',
};

/** Warm greys through to white - a radiology palette, not a pretty one. */
const STOPS = ['#0d1017', '#3f4654', '#8d8a86', '#ded6c8', '#ffffff'];

const PLOT_HEIGHT = 96;
const SAMPLES = 160;

const INK = '#232430';
const FAINT = '#c3c8d2';
const HOT = '#e1462c';
const TEAL = '#1f7a8c';

/**
 * The intensity one ray meets crossing the frog, side to side.
 *
 * Taken across the shoulders rather than down the middle, because that line
 * crosses skin, a long run of stained muscle and one limb bone on its way
 * through - so the curve has the shape the four modes have something to
 * disagree about. Every plot below is this same curve; only what the mode
 * does with it changes.
 */
function sampleRay(data) {
  const [nx, ny, nz] = SHAPE;
  const j = Math.round(0.55 * ny);
  const k = Math.round(0.30 * nz);
  const out = new Float32Array(SAMPLES);
  for (let s = 0; s < SAMPLES; s++) {
    const i = Math.min(nx - 1, Math.round((s / (SAMPLES - 1)) * (nx - 1)));
    out[s] = data[(k * ny + j) * nx + i] / 255;
  }
  return out;
}

/** The opacity this scene's transfer function gives a sample. */
function alphaOf(v) {
  const w = WIDTH;
  const t = Math.min(1, Math.max(0, (v - (THRESHOLD - w)) / (2 * w)));
  return t * t * (3 - 2 * t) * DENSITY;
}

// Just above the skin, so the isosurface closes over the animal instead of
// over the noise around it, and the emission ramp opens where the specimen
// starts.
const THRESHOLD = BANDS.skin + 0.04;
const WIDTH = 0.06;

// One sample is worth a tenth, not a half. At a half a ray saturates two
// samples into the skin and every pixel of the emission panel is the color
// of skin - a black frog-shaped hole. A tenth lets a ray cross a centimetre
// of the animal before it fills up, so what comes out is the average of what
// is in there rather than the color of the first thing it touched.
const DENSITY = 0.1;

/**
 * One ray, and what each mode keeps of it.
 *
 * Same axes, same curve, same frame in all four - the differences between the
 * panels are then differences in the operation and nothing else.
 */
function drawRay(g2d, w, h, profile, mode) {
  const pad = 3;
  const top = 8;
  const base = h - 24;      // room for a caption that can be read from a room
  const x = (s) => pad + (s / (SAMPLES - 1)) * (w - 2 * pad);
  const y = (v) => base - v * (base - top);

  g2d.clearRect(0, 0, w, h);
  // Sized against the canvas, not in fixed pixels. A panel is 300 px wide on
  // the scrolling page and 480 on a 1080p projector, and a caption locked to
  // 14 px is legible in the first and invisible in the second.
  g2d.font = `600 ${Math.round(Math.min(26, Math.max(15, w / 21)))}px `
    + 'Urbanist, sans-serif';
  g2d.textBaseline = 'alphabetic';

  // The profile, always.
  g2d.beginPath();
  for (let s = 0; s < SAMPLES; s++) {
    const px = x(s);
    const py = y(profile[s]);
    if (s === 0) g2d.moveTo(px, py); else g2d.lineTo(px, py);
  }
  g2d.strokeStyle = mode === 1 ? FAINT : '#8d95a3';
  g2d.lineWidth = 1.6;
  g2d.stroke();

  g2d.strokeStyle = '#dfe3ea';
  g2d.lineWidth = 1;
  g2d.beginPath();
  g2d.moveTo(pad, base);
  g2d.lineTo(w - pad, base);
  g2d.stroke();

  const dot = (s, v, color) => {
    g2d.fillStyle = color;
    g2d.beginPath();
    g2d.arc(x(s), y(v), 4, 0, Math.PI * 2);
    g2d.fill();
  };
  const label = (text, px, color, align = 'center') => {
    g2d.fillStyle = color;
    g2d.textAlign = align;
    g2d.fillText(text, px, h - 5);
  };

  if (mode === 0) {                                   // slice
    const s = Math.round(SAMPLES * 0.5);
    g2d.strokeStyle = HOT;
    g2d.lineWidth = 1.6;
    g2d.beginPath();
    g2d.moveTo(x(s), top);
    g2d.lineTo(x(s), base);
    g2d.stroke();
    dot(s, profile[s], HOT);
    label('one sample at a chosen depth', w / 2, HOT);
    return;
  }

  if (mode === 1) {                                   // maximum intensity
    let peak = 0;
    let at = 0;
    for (let s = 0; s < SAMPLES; s++) {
      if (profile[s] > peak) { peak = profile[s]; at = s; }
    }
    g2d.setLineDash([3, 3]);
    g2d.strokeStyle = HOT;
    g2d.lineWidth = 1.4;
    g2d.beginPath();
    g2d.moveTo(pad, y(peak));
    g2d.lineTo(w - pad, y(peak));
    g2d.stroke();
    g2d.setLineDash([]);
    dot(at, peak, HOT);
    label('the largest sample along the ray', w / 2, HOT);
    return;
  }

  if (mode === 2) {                                   // emission-absorption
    // The accumulation, on the same axes: every sample adds a little until
    // the ray is opaque and the rest of the animal stops mattering.
    let acc = 0;
    let closed = -1;
    g2d.beginPath();
    for (let s = 0; s < SAMPLES; s++) {
      const a = alphaOf(profile[s]);
      acc += a * (1 - acc);
      if (closed < 0 && acc > 0.97) closed = s;
      const px = x(s);
      const py = y(acc);
      if (s === 0) g2d.moveTo(px, py); else g2d.lineTo(px, py);
    }
    g2d.strokeStyle = TEAL;
    g2d.lineWidth = 2;
    g2d.stroke();
    if (closed > 0) {
      g2d.fillStyle = 'rgba(180, 186, 196, 0.30)';
      g2d.fillRect(x(closed), top, w - pad - x(closed), base - top);
    }
    label('each sample adds, until the ray is opaque', w / 2, TEAL);
    return;
  }

  // isosurface
  let hit = -1;
  for (let s = 0; s < SAMPLES; s++) {
    if (profile[s] >= THRESHOLD) { hit = s; break; }
  }
  g2d.setLineDash([3, 3]);
  g2d.strokeStyle = FAINT;
  g2d.lineWidth = 1.2;
  g2d.beginPath();
  g2d.moveTo(pad, y(THRESHOLD));
  g2d.lineTo(w - pad, y(THRESHOLD));
  g2d.stroke();
  g2d.setLineDash([]);
  if (hit >= 0) {
    g2d.fillStyle = 'rgba(180, 186, 196, 0.30)';
    g2d.fillRect(x(hit), top, w - pad - x(hit), base - top);
    dot(hit, profile[hit], HOT);
  }
  label('the first sample above the threshold', w / 2, HOT);
}

defineScene('volume-modes', (ctx) => {
  const { scene, projection, frustum, view, controls } = ctx;
  const camera = projection('orthographic');
  frustum(1.18, 5.2);
  // Level, and looking straight at the row. Where the frog faces is the
  // tilt group's job, below.
  view(0, 0, 3.4);
  // OrbitControls would swing the outer panels through depth; panelOrbit
  // turns each panel in place instead.
  controls.enabled = false;
  for (let i = 1; i <= ORDER.length; i++) camera.layers.enable(i);

  // The strip is dark, because these four are dark renderings. On white the
  // background of a slice is a black rectangle sitting in a white slide, and
  // the three volume renderings lose their faint ends into the page.
  ctx.el.style.background = '#101319';

  // Titles only. Each panel already carries a caption inside its plot saying
  // what that mode does with the ray; a paragraph underneath as well made
  // three layers of text per panel, all of it small.
  panelStrip(ctx.el, ORDER.map((n) => LABELS[n]), { numbered: false });

  const panels = [];
  const plots = panelPlots(ctx.el, ORDER.length, {
    height: PLOT_HEIGHT, draw: () => redraw(),
  });
  let profile = null;

  function redraw() {
    if (!profile) return;
    plots.resize();
    plots.contexts.forEach((g2d, i) => {
      const { clientWidth } = plots.canvases[i];
      if (clientWidth < 1) return;
      drawRay(g2d, clientWidth, PLOT_HEIGHT, profile, i);
    });
  }
  loadScan().then((texture) => {
    profile = sampleRay(texture.image.data);
    redraw();
    ORDER.forEach((name, i) => {
      const panel = new THREE.Group();
      scene.add(panel);
      panels.push(panel);

      // The frog lies on its back inside the panel. The scan is sliced
      // dorsal to ventral, so its y axis is the animal's thickness; a
      // quarter turn about x points that at the camera and what the panel
      // shows is a frog's back, which is the view of a frog nobody has to be
      // told about. It is a group inside the panel rather than a starting
      // angle on panelOrbit, so dragging still starts from level and the
      // spread stays a row - see panelOrbit for why the camera cannot do it.
      const tilt = new THREE.Group();
      tilt.rotation.x = Math.PI / 2;
      panel.add(tilt);

      const volume = makeVolume(tilt, {
        shape: SHAPE,
        bounds: BOUNDS,
        stops: STOPS,
        texture,
        threshold: THRESHOLD,
        density: DENSITY,
        width: WIDTH,
        window: WINDOW,
        curve: 1,
        steps: 180,
        // Unlit, so the difference between the panels is the mode and
        // nothing else. Isosurface does its own shading regardless - a
        // surface with no light on it is a silhouette.
        shade: 0,
        mode: MODES[name],
      });
      // Layers last, so a panel's lights and geometry go with it and the
      // orthographic camera can draw the four without them overlapping.
      panel.traverse((o) => o.layers.set(i + 1));
    });
  });

  const orbit = panelOrbit(ctx, panels);

  return {
    tick: () => {
      spreadPanels(camera, panels);
      orbit();
    },
  };
});
