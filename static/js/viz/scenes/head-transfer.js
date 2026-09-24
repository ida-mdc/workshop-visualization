// Three transfer functions, one volume, and the curves that produced them.
//
// A transfer function is a lookup: value in, colour and opacity out. In
// emission-absorption it is the whole of what the picture shows, and it is
// the thing people change without realising they have changed what the
// picture claims. So the curve is drawn under each panel, from the same 256
// entries the shader samples - not a diagram of a transfer function, the
// actual one.
//
// The three are deliberately not "one ramp, moved". A single rising shoulder
// can only ever show more or less of the same thing; what makes a transfer
// function worth a slide is that it can hide something BRIGHTER than what it
// shows, and that needs anchor points which come back down. That is how the
// skin comes off in the third panel while the brain stays.
//
// Drag to turn all three together. No sliders and no zoom - the comparison
// is the point, and the prose under the slide says what each one does.

import {
  defineScene, THREE, panelStrip, panelPlots, spreadPanels, panelOrbit,
} from '../runtime.js';
import { makeVolume, transferLUT, MODES } from '../volume.js';
import { loadHead, SHAPE, BOUNDS } from '../head.js';

// Where things sit in this scan, as a fraction of the value range: air is 0
// and fills four fifths of the block, tissue starts around 0.1, the brain
// bulks between 0.4 and 0.6, and skin and fat are the bright tail above 0.7.
const PRESETS = [
  {
    name: 'a wide ramp',
    body: 'Faint from the first tissue value up. A ghost of the whole head, '
      + 'hiding nothing - and a colourful map, so small differences in value '
      + 'are still differences you can see.',
    // Purple through teal and green to red: far more hue range than a
    // single-family ramp, which on this scan is most of what makes the
    // interior legible at all.
    stops: ['#2b0f54', '#1f6f8b', '#3fb8a0', '#f2c14e', '#f25c54'],
    points: [[0.00, 0.0], [0.08, 0.0], [0.16, 0.02], [1.00, 0.06]],
  },
  {
    name: 'a step at the skin',
    body: 'Nothing until the skin, then nearly solid. The first thing a ray '
      + 'meets stops it, so the head is a closed object and you are looking '
      + 'at its outside.',
    stops: ['#2b1608', '#8a5a2f', '#d9a061', '#f5e0c0', '#ffffff'],
    points: [[0.00, 0.0], [0.14, 0.0], [0.20, 0.45], [1.00, 0.6]],
  },
  {
    name: 'a window on the brain',
    body: 'Opaque across the brain band and back to zero above it, so the '
      + 'brighter skin and fat are never drawn and the ray reaches the '
      + 'inside. Only anchor points can do this.',
    stops: ['#14061c', '#5b1f6b', '#c0407a', '#f9a86a', '#fff3c4'],
    // Closes at 0.58, not 0.70: at 0.70 the scalp was still being drawn and
    // the panel looked like the one beside it.
    points: [
      [0.00, 0.0], [0.38, 0.0], [0.43, 0.15], [0.49, 0.20],
      [0.53, 0.06], [0.56, 0.0], [1.00, 0.0],
    ],
  },
];

const PLOT_HEIGHT = 58;

/**
 * Draw one transfer function: the colour it maps to, and the opacity it gives.
 *
 * The colour runs as a band along the bottom because that is the part people
 * read as "what colour is this value"; the opacity is the curve above it,
 * which decides whether the value is visible at all. Both come from the same
 * lookup the shader samples, and the red dots are the anchors somebody placed.
 */
function drawTransfer(g2d, width, height, preset) {
  const lut = transferLUT(preset.stops, { points: preset.points });
  const n = lut.length / 4;
  const band = 11;
  const plot = height - band - 2;
  const peak = Math.max(0.08, ...preset.points.map((q) => q[1]));

  g2d.clearRect(0, 0, width, height);

  for (let i = 0; i < n; i++) {
    g2d.fillStyle = `rgb(${lut[i * 4]},${lut[i * 4 + 1]},${lut[i * 4 + 2]})`;
    g2d.fillRect((i / n) * width, plot + 2, width / n + 1, band);
  }

  // Scaled to this preset's own peak, so a curve that never exceeds 0.06 is
  // a readable shape rather than a flat line along the axis.
  const y = (a) => plot - (a / peak) * (plot - 4);

  g2d.beginPath();
  g2d.moveTo(0, plot);
  for (let i = 0; i < n; i++) {
    g2d.lineTo((i / (n - 1)) * width, y(lut[i * 4 + 3] / 255));
  }
  g2d.lineTo(width, plot);
  g2d.closePath();
  g2d.fillStyle = 'rgba(31, 122, 140, 0.20)';
  g2d.fill();

  g2d.beginPath();
  for (let i = 0; i < n; i++) {
    const px = (i / (n - 1)) * width;
    const py = y(lut[i * 4 + 3] / 255);
    if (i === 0) g2d.moveTo(px, py); else g2d.lineTo(px, py);
  }
  g2d.strokeStyle = '#1f7a8c';
  g2d.lineWidth = 1.6;
  g2d.stroke();

  g2d.fillStyle = '#e1462c';
  for (const [v, a] of preset.points) {
    g2d.beginPath();
    g2d.arc(v * width, y(a), 2.6, 0, Math.PI * 2);
    g2d.fill();
  }

  g2d.strokeStyle = '#d6dae2';
  g2d.lineWidth = 1;
  g2d.strokeRect(0.5, 0.5, width - 1, plot - 1);
}

defineScene('head-transfer', (ctx) => {
  const { scene, projection, frustum, view, controls } = ctx;
  const camera = projection('orthographic');
  frustum(1.3, 3.6);
  // Round to the face: it sits at the low-x end of the volume.
  view(-1.7, 0.45, 3.4);
  controls.enabled = false;
  for (let i = 1; i <= PRESETS.length; i++) camera.layers.enable(i);

  panelStrip(ctx.el, PRESETS.map((p) => ({ title: p.name, body: p.body })));
  const plots = panelPlots(ctx.el, PRESETS.length, { height: PLOT_HEIGHT });

  const panels = [];

  function redraw() {
    plots.resize();
    plots.contexts.forEach((g2d, i) => {
      const { clientWidth } = plots.canvases[i];
      // Before first layout the canvas has no width and there is nothing to
      // draw into; the load handler and the resize listener come back later.
      if (clientWidth < 1) return;
      drawTransfer(g2d, clientWidth, PLOT_HEIGHT, PRESETS[i]);
    });
  }
  window.addEventListener('resize', redraw);

  loadHead().then((texture) => {
    PRESETS.forEach((preset, i) => {
      const panel = new THREE.Group();
      scene.add(panel);
      panels.push(panel);

      makeVolume(panel, {
        shape: SHAPE,
        bounds: BOUNDS,
        stops: preset.stops,
        points: preset.points,
        texture,
        steps: 200,
        shade: 0,
        mode: MODES['Emission-absorption'],
      });
      panel.traverse((o) => o.layers.set(i + 1));
    });
    redraw();
  });

  redraw();

  const orbit = panelOrbit(ctx, panels);

  return {
    tick: () => {
      spreadPanels(camera, panels);
      orbit();
    },
  };
});
