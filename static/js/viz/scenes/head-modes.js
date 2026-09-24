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
// single ray actually meets crossing this head, front to back, and what the
// mode does with it. That profile is read out of the volume, not drawn by
// hand - air, skin, skull, brain, skull, skin, air - so the four little plots
// and the four big pictures are two views of one operation.

import {
  defineScene, THREE, panelStrip, panelPlots, spreadPanels, panelOrbit,
} from '../runtime.js';
import { makeVolume, MODES } from '../volume.js';
import { loadHead, SHAPE, BOUNDS } from '../head.js';

const ORDER = ['Slice', 'MIP', 'Emission-absorption', 'Isosurface'];

/** Warm greys through to white - a radiology palette, not a pretty one. */
const STOPS = ['#0d1017', '#3f4654', '#8d8a86', '#ded6c8', '#ffffff'];

const PLOT_HEIGHT = 96;
const SAMPLES = 160;

const INK = '#232430';
const FAINT = '#c3c8d2';
const HOT = '#e1462c';
const TEAL = '#1f7a8c';

/**
 * The intensity one ray meets crossing the head front to back.
 *
 * Taken out of the volume at eye level on the midline, so the profile is the
 * real thing: air, the bright skin and fat, the dark skull, the brain, and
 * out the other side. Every plot below is this same curve - only what the
 * mode does with it changes.
 */
function sampleRay(data) {
  const [nx, ny, nz] = SHAPE;
  const j = Math.round(0.46 * ny);
  const k = Math.round(0.50 * nz);
  const out = new Float32Array(SAMPLES);
  for (let s = 0; s < SAMPLES; s++) {
    const i = Math.min(nx - 1, Math.round((s / (SAMPLES - 1)) * (nx - 1)));
    out[s] = data[(k * ny + j) * nx + i] / 255;
  }
  return out;
}

/** The opacity this scene's transfer function gives a sample. */
function alphaOf(v) {
  const w = 0.07;
  const t = Math.min(1, Math.max(0, (v - (THRESHOLD - w)) / (2 * w)));
  return t * t * (3 - 2 * t) * DENSITY;
}

const THRESHOLD = 0.32;
const DENSITY = 0.5;

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
  g2d.font = '600 14px Urbanist, sans-serif';
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

  const dot = (s, v, colour) => {
    g2d.fillStyle = colour;
    g2d.beginPath();
    g2d.arc(x(s), y(v), 4, 0, Math.PI * 2);
    g2d.fill();
  };
  const label = (text, px, colour, align = 'center') => {
    g2d.fillStyle = colour;
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
    label('one sample, the rest ignored', w / 2, HOT);
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
    label('the largest of all of them', w / 2, HOT);
    return;
  }

  if (mode === 2) {                                   // emission-absorption
    // The accumulation, on the same axes: every sample adds a little until
    // the ray is opaque and the rest of the head stops mattering.
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
    label('every sample adds, until the ray is full', w / 2, TEAL);
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
  label('the first crossing; the rest is light', w / 2, HOT);
}

defineScene('head-modes', (ctx) => {
  const { scene, projection, frustum, view, controls } = ctx;
  const camera = projection('orthographic');
  frustum(1.25, 5.0);
  view(-1.7, 0.45, 3.4);
  // OrbitControls would swing the outer panels through depth; panelOrbit
  // turns each panel in place instead.
  controls.enabled = false;
  for (let i = 1; i <= ORDER.length; i++) camera.layers.enable(i);

  panelStrip(ctx.el, [
    {
      title: 'slice',
      body: 'One sample on one plane, perpendicular to the view - so turning '
        + 'the volume cuts a new plane. The only mode that still shows you '
        + 'the background.',
    },
    {
      title: 'maximum intensity',
      body: 'The brightest sample along each ray. Superb for sparse bright '
        + 'structures, and it throws away depth order entirely - nothing '
        + 'here says which of two things is in front.',
    },
    {
      title: 'emission-absorption',
      body: 'Colour and opacity accumulated front to back. What people mean '
        + 'by "volume rendering", and governed entirely by the transfer '
        + 'function.',
    },
    {
      title: 'isosurface',
      body: 'Stops at the first sample over the threshold and shades it. A '
        + 'surface, with no mesh ever built - and only as trustworthy as the '
        + 'threshold.',
    },
  ]);

  const panels = [];
  const plots = panelPlots(ctx.el, ORDER.length, { height: PLOT_HEIGHT });
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
  window.addEventListener('resize', redraw);

  loadHead().then((texture) => {
    profile = sampleRay(texture.image.data);
    redraw();
    ORDER.forEach((name, i) => {
      const panel = new THREE.Group();
      scene.add(panel);
      panels.push(panel);

      const volume = makeVolume(panel, {
        shape: SHAPE,
        bounds: BOUNDS,
        stops: STOPS,
        texture,
        threshold: THRESHOLD,
        density: DENSITY,
        width: 0.07,
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
