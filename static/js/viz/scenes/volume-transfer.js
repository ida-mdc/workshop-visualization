// Three transfer functions, one volume, and the curves that produced them.
//
// A transfer function is a lookup: value in, color and opacity out. In
// emission-absorption it is the whole of what the picture shows, and it is
// the thing people change without realising they have changed what the
// picture claims. So the curve is drawn under each panel, from the same 256
// entries the shader samples - not a diagram of a transfer function, the
// actual one.
//
// Two of the three are steps, at the two levels anybody would reach for -
// the skin and the bone - because seeing those side by side is what makes
// the third one land. The third is a window: opaque across the stained soft
// tissue and back to zero before the skeleton. It is the reason a transfer
// function is worth a slide of its own, because it hides the BRIGHTEST thing
// in the volume, and no threshold and no contrast slider can do that.
//
// Drag to turn all three together. No sliders and no zoom - the comparison
// is the point.
//
// Each panel is labelled with what its curve IS; what it DOES is a line of
// slide text in three columns underneath, in content/voxels.md. That text
// used to live here, as a paragraph per panel in the caption strip, and it
// was set at 0.4em so that three paragraphs would fit - which is unreadable
// past the second row of a lecture theatre. A caption can be small because
// it only names a thing. A sentence somebody is meant to read has to be the
// size of the rest of the slide, and that means living on the slide.

import {
  defineScene, THREE, panelStrip, panelPlots, spreadPanels, panelOrbit,
} from '../runtime.js';
import { makeVolume, transferLUT, MODES } from '../volume.js';
import { loadScan, SHAPE, BOUNDS } from '../scan.js';

// Where things sit in this scan, as a fraction of the value range: air is 0
// and fills four fifths of the block, the skin starts around 0.09, the
// stained muscle and gut bulk between 0.15 and 0.5, bone is the band above
// 0.55, and the two eye lenses are the white tail at the very top. Those
// numbers are written down in BANDS in scan.js.
//
// Each preset also carries its own color window, which is the band of values
// its curve lets through. Without one a ramp is spread over the whole range
// and the panel is rendered almost entirely out of the ramp's dark end: the
// skin step came out a brown silhouette and the soft-tissue window a purple
// one. Windowing to the band the curve is about is what makes each panel look
// like the thing it is showing.
const PRESETS = [
  {
    name: 'a step at the skin',
    stops: ['#2b1608', '#8a5a2f', '#d9a061', '#f5e0c0', '#ffffff'],
    points: [[0.00, 0.0], [0.07, 0.0], [0.12, 0.40], [1.00, 0.55]],
    window: [0.05, 0.32],
  },
  {
    name: 'a step at the bone',
    // The same shape again, moved up past the soft tissue. Two steps rather
    // than one because this is the pair anybody actually reaches for, and
    // seeing them next to each other is what makes the third panel land.
    // Cool and rising to white, which is what a skeleton wants and what the
    // dark strip these three are drawn on allows. It was briefly the other
    // way round, mid-tone and ending in pale blue, from when the strip was
    // the white of the slide and a white skeleton disappeared into it.
    stops: ['#10151c', '#3a4a5c', '#8fa2b5', '#dde6ee', '#ffffff'],
    points: [[0.00, 0.0], [0.48, 0.0], [0.57, 0.45], [1.00, 0.70]],
    window: [0.42, 0.72],
  },
  {
    name: 'a window on the soft tissue',
    // Magma, inverted. This is the faintest of the three - the curve peaks
    // at 0.07, so a ray only ever collects a little - and the usual dark end
    // of a magma ramp put most of that little at the bottom of the range.
    // Turned round, the same accumulation comes out bright.
    stops: ['#fff3c4', '#f9a86a', '#c0407a', '#5b1f6b', '#14061c'],
    // Opens above the skin and closes below the bone. The skeleton is the
    // brightest thing in the animal and it is simply never drawn, which is
    // the one thing no threshold and no contrast slider can do for you.
    //
    // It peaks at 0.07, not at 0.4. Higher and a ray saturates within a few
    // samples of entering the frog, so what comes out is a frog-shaped blob
    // of solid color: the point about reaching the inside, made by showing
    // nothing that is inside. Low enough to see through a centimetre of
    // muscle is what puts the organs back.
    points: [
      [0.00, 0.0], [0.12, 0.0], [0.19, 0.05], [0.34, 0.07],
      [0.45, 0.02], [0.51, 0.0], [1.00, 0.0],
    ],
    window: [0.10, 0.50],
  },
];

const PLOT_HEIGHT = 58;

/**
 * Draw one transfer function: the color it maps to, and the opacity it gives.
 *
 * The color runs as a band along the bottom because that is the part people
 * read as "what color is this value"; the opacity is the curve above it,
 * which decides whether the value is visible at all. Both come from the same
 * lookup the shader samples, and the red dots are the anchors somebody placed.
 */
function drawTransfer(g2d, width, height, preset) {
  const lut = transferLUT(preset.stops,
    { points: preset.points, window: preset.window });
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

defineScene('volume-transfer', (ctx) => {
  const { scene, projection, frustum, view, controls } = ctx;
  const camera = projection('orthographic');
  frustum(1.18, 3.6);
  // Level, and looking straight at the row - the frog is laid on its back by
  // the tilt group below, exactly as in volume-modes.js.
  view(0, 0, 3.4);
  controls.enabled = false;
  for (let i = 1; i <= PRESETS.length; i++) camera.layers.enable(i);

  // Dark, for the same reason volume-modes.js is dark: these are volume
  // renderings and they were built to sit on black.
  ctx.el.style.background = '#101319';

  panelStrip(ctx.el, PRESETS.map((p) => p.name), { numbered: false });
  const plots = panelPlots(ctx.el, PRESETS.length, {
    height: PLOT_HEIGHT, draw: () => redraw(),
  });

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

  loadScan().then((texture) => {
    PRESETS.forEach((preset, i) => {
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

      makeVolume(tilt, {
        shape: SHAPE,
        bounds: BOUNDS,
        stops: preset.stops,
        points: preset.points,
        window: preset.window,
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
