// Choosing a colormap, on data that shows the difference.
//
// A smooth heightfield, coloured by height. Smooth data is where a colormap's
// faults show: on a specimen with hard edges you cannot tell whether a
// boundary you see is in the data or in the palette.
//
// Watch for three things.
//
//   Jet has bands. The cyan-to-yellow stretch changes lightness fast, so it
//   invents ridges where the surface is perfectly smooth - and hides real
//   structure in the long, flat green.
//
//   Greyscale is the print test. A map that survives it is monotonic in
//   lightness, which is the property that makes a colour ordering readable.
//
//   The colour-vision filter is the accessibility test. Roughly one man in
//   twelve sees the deuteranope version, and jet loses most of its range in it
//   while viridis keeps almost all of its own.

import { defineScene, THREE, palette, ramp } from '../runtime.js';

const MAPS = {
  Viridis: ['#440154', '#414487', '#2a788e', '#22a884', '#7ad151', '#fde725'],
  Magma: ['#000004', '#3b0f70', '#8c2981', '#de4968', '#fe9f6d', '#fcfdbf'],
  Jet: ['#00007f', '#0000ff', '#007fff', '#00ffff', '#7fff7f', '#ffff00',
    '#ff7f00', '#ff0000', '#7f0000'],
  Greys: ['#111111', '#ffffff'],
  'One hue': ['#0b2d4a', '#2c5f86', '#7fb4d8', '#e8f4fb'],
};

/** Smooth hills - a few wide bumps plus a gentle ripple, no noise. */
function height(x, z) {
  const bump = (cx, cz, s, a) =>
    a * Math.exp(-(((x - cx) ** 2 + (z - cz) ** 2) / (s * s)));
  return bump(-0.7, -0.2, 0.62, 0.46)
    + bump(0.65, 0.35, 0.50, 0.38)
    + bump(0.15, -0.65, 0.34, 0.22)
    - bump(-0.25, 0.60, 0.40, 0.18)
    + 0.035 * Math.sin(x * 4.1) * Math.cos(z * 3.6);
}

/**
 * Vienot's deuteranopia approximation, applied in linear RGB - which is where
 * three.js keeps colours, so no conversion is needed either way.
 */
function deuteranope(c) {
  const r = c.r;
  const g = c.g;
  const b = c.b;
  c.setRGB(
    0.625 * r + 0.375 * g,
    0.700 * r + 0.300 * g,
    0.300 * g + 0.700 * b,
  );
  return c;
}

function luminance(c) {
  const y = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  c.setRGB(y, y, y);
  return c;
}

defineScene('colormap-choice', ({ scene, ui, view }) => {
  view(0.1, 2.0, 2.7, 1.5, [0, -0.1, 0]);

  const geo = new THREE.PlaneGeometry(3.0, 3.0, 150, 150);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const scalar = new Float32Array(pos.count);
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    const h = height(pos.getX(i), pos.getZ(i));
    pos.setY(i, h);
    scalar[i] = h;
    lo = Math.min(lo, h);
    hi = Math.max(hi, h);
  }
  geo.setAttribute('color',
    new THREE.BufferAttribute(new Float32Array(pos.count * 3), 3));
  geo.computeVertexNormals();

  const surface = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 1.0, metalness: 0,
    envMapIntensity: 0.25, side: THREE.DoubleSide,
  }));
  scene.add(surface);
  // Deliberately dim, even lighting: shading that competes with the colour
  // would make it impossible to judge the colour.
  const fill = new THREE.DirectionalLight(0xffffff, 0.55);
  fill.position.set(2, 5, 3);
  scene.add(fill);

  let map = 'Viridis';
  let filter = 'none';

  function repaint() {
    const colors = geo.attributes.color;
    const stops = MAPS[map];
    for (let i = 0; i < scalar.length; i++) {
      const c = ramp(stops, (scalar[i] - lo) / (hi - lo));
      if (filter === 'grey') luminance(c);
      else if (filter === 'cvd') deuteranope(c);
      colors.setXYZ(i, c.r, c.g, c.b);
    }
    colors.needsUpdate = true;
  }

  ui.choice('Colormap', Object.keys(MAPS), (_, name) => {
    map = name;
    repaint();
  });

  ui.choice('Seen as', ['Full colour', 'Greyscale', 'Deuteranope'], (i) => {
    filter = ['none', 'grey', 'cvd'][i];
    repaint();
  });
});
