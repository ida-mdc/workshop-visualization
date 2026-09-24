// Point clouds: positions, and nothing joining them.
//
// The reason this gets its own scene rather than a bullet is that the failure
// mode is visual. Turn the density down and the surface stops existing - there
// is no geometry underneath to fall back on, the way a decimated mesh still
// has faces. Turn the splat size up instead and it looks solid again while
// carrying exactly as little information: the thing to watch for in anyone's
// point cloud figure, including your own.

import { defineScene, THREE, palette, ramp } from '../runtime.js';
import * as shape from '../shape.js';

const MAX_POINTS = 120000;

defineScene('point-cloud', ({ scene, ui, view }) => {
  view(...shape.DETAIL_VIEW, shape.DETAIL_RADIUS);

  const positions = shape.surfacePoints(MAX_POINTS);

  // Height, as a stand-in for whatever per-point attribute a real cloud
  // carries: return intensity, classification, localisation precision.
  const colors = new Float32Array(MAX_POINTS * 3);
  const HEIGHT = [palette.plum, palette.teal, palette.amber, palette.roseLight];
  for (let i = 0; i < MAX_POINTS; i++) {
    const t = (positions[i * 3 + 1] + shape.BOUNDS.y) / (2 * shape.BOUNDS.y);
    const c = ramp(HEIGHT, t);
    colors.set([c.r, c.g, c.b], i * 3);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setDrawRange(0, 20000);

  const material = new THREE.PointsMaterial({ size: 0.015, vertexColors: true });
  scene.add(new THREE.Points(geo, material));

  // Logarithmic, because the interesting range spans two and a half orders of
  // magnitude: a linear slider would spend most of its travel above the
  // density at which the surface has already closed up.
  const decades = (n) => Math.round(Math.log10(n) * 1000);
  ui.slider('Points', {
    min: decades(400), max: decades(MAX_POINTS), step: 1, value: decades(20000),
    format: (v) => Math.round(10 ** (v / 1000)).toLocaleString('en'),
  }, (v) => {
    geo.setDrawRange(0, Math.min(Math.round(10 ** (v / 1000)), MAX_POINTS));
  });

  // Colour is stated rather than offered. It is height here, and saying so
  // is the point - a point cloud carries attributes, and somebody chose
  // which one you are looking at.
  ui.readout('coloured by height');
});
