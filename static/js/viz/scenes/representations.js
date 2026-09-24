// The centrepiece of the data-types part: one specimen, four representations.
//
// All four are derived from the one specimen defined in shape.js, so this is
// not four models that happen to look alike - it is one thing, sampled four
// ways. The differences on screen are exactly the differences that matter when
// choosing a format and a viewer.

import { defineScene, THREE, palette, ramp, clearGroup } from '../runtime.js';
import * as shape from '../shape.js';
import { bucketedVoxels, acquisitionBox } from '../voxels.js';

// Coarse on purpose. The background is drawn too, so the count is the whole
// block rather than just the specimen, and this is a slide about what the
// representations *are* - the voxels session is where resolution gets its own
// slider.
const GRID = 34;          // voxels across x

/** Sequential, single-hue-family, monotonic in lightness - see voxel-grid.js. */
const VALUE = ['#b3cee5', '#4a83b4', '#07365e'];
const POINTS = 9000;

/**
 * What is actually in the file, for each representation.
 *
 * In the scene rather than on the slide, so it changes when the picture does.
 * These are deliberately about storage, not about rendering: the question
 * people get wrong is what they are holding, not what it looks like.
 */
const STORED = {
  Voxels: 'In the file: a 3D array of numbers - one per sample, in a fixed '
    + 'grid that fills the whole box - plus the physical size of one voxel. '
    + 'Nothing in it says where the specimen is.',
  'Point cloud': 'In the file: a list of x, y, z. One row per point, in no '
    + 'particular order, with a column for each attribute - intensity, class, '
    + 'colour, time. Nothing says which points are neighbours.',
  Mesh: 'In the file: a list of vertex coordinates, and a list of triangles '
    + 'that index into it. A surface and no interior - plus, usually, normals, '
    + 'texture coordinates and a material.',
  'Vector field': 'In the file: three numbers per location, on a grid or at '
    + 'the nodes of a mesh, usually alongside scalars like pressure. The '
    + 'geometry it belongs to is stored with it.',
};

defineScene('representations', ({ scene, ui, view, refit }) => {
  view(3.6, 2.2, 4.2, shape.FIT_RADIUS);

  // --- Mesh: a surface, and only a surface -------------------------------
  const mesh = new THREE.Mesh(
    shape.geometry(56),
    new THREE.MeshPhysicalMaterial({
      vertexColors: true, roughness: 0.42, clearcoat: 0.35,
      clearcoatRoughness: 0.5,
    }),
  );

  // --- Voxels: a regular lattice that also fills the inside --------------
  const voxels = new THREE.Group();
  let voxelOpacity = 0.85;
  function rebuildVoxels() {
    clearGroup(voxels);
    voxels.add(buildVoxels(voxelOpacity));
    voxels.add(acquisitionBox(shape.BOUNDS));
  }
  rebuildVoxels();

  // --- Points: positions, no connectivity --------------------------------
  const points = new THREE.Points(
    new THREE.BufferGeometry().setAttribute(
      'position',
      new THREE.BufferAttribute(shape.surfacePoints(POINTS), 3),
    ),
    new THREE.PointsMaterial({ vertexColors: true, size: 0.02 }),
  );

  // --- Vector field: a value per location, the shape only as context -----
  const vectors = buildVectors();

  const all = { Voxels: voxels, 'Point cloud': points, Mesh: mesh, 'Vector field': vectors };
  for (const obj of Object.values(all)) {
    obj.visible = false;
    scene.add(obj);
  }

  const note = ui.note();

  ui.slider('Voxel opacity', {
    min: 0.15, max: 1, step: 0.05, value: 0.85,
    format: (v) => v.toFixed(2),
  }, (v) => { voxelOpacity = v; rebuildVoxels(); });

  ui.choice('Represent as', Object.keys(all), (_, label) => {
    for (const [key, obj] of Object.entries(all)) obj.visible = key === label;
    note(STORED[label]);
    // The field is sampled in a box around the specimen, so it needs more room
    // than the specimen does. Refit rather than re-aim: whatever angle the
    // specimen is being shown from has to survive switching representation,
    // or the four stop reading as one object.
    refit(label === 'Mesh' || label === 'Point cloud'
      ? shape.FIT_RADIUS : 1.6);
  }, 2);
});

/**
 * The voxel representation: the specimen, and the block it sits in.
 *
 * The background is the point of this one. A volume is a fixed block of
 * space and every position in it holds a number - here a smooth halo of weak
 * signal around the specimen, the way an embedded or illuminated sample sits
 * in a faintly signal-bearing medium. Turning the opacity down peels that
 * halo away shell by shell, which is what "the picture is a transfer
 * function" looks like when you can watch it happen.
 */
function buildVoxels(opacity) {
  const B = shape.BOUNDS;
  const step = (2 * B.x) / GRID;
  const ny = Math.round((2 * B.y) / step);
  const nz = GRID;

  const samples = [];
  for (let i = 0; i < GRID; i++) {
    const x = -B.x + (i + 0.5) * step;
    for (let j = 0; j < ny; j++) {
      const y = -B.y + (j + 0.5) * step;
      for (let k = 0; k < nz; k++) {
        const z = -B.z + (k + 0.5) * step;
        const inside = shape.isInside(x, y, z);
        const v = inside ? shape.intensityAt(x, y, z)
          : backgroundGradient(x, y, z);
        // Background is thinned as well as faded. Stacking thousands of
        // translucent cubes composites to opaque however low each one's alpha
        // is, so the gradient has to show up in how *many* are drawn, not
        // only in how solid each one is. Deterministic, so it does not
        // shimmer when the slider moves.
        if (!inside && hash01(x, y, z) > (v / 0.30) ** 1.5 * 0.34) continue;
        // Opacity follows the signal rather than a threshold: the point of
        // this view is that a voxel fades out as its value falls, so the weak
        // ones go first when the slider comes down. The specimen sits on a
        // higher floor so it stays readable through the veil around it.
        const a = (inside ? 0.55 + 0.45 * v : v ** 0.7) * opacity;
        samples.push(x, y, z, v, a);
      }
    }
  }
  return bucketedVoxels({
    samples,
    size: { x: step, y: step, z: step },
    colorFor: (v) => ramp(VALUE, v),
  });
}

/** Deterministic 0..1 from a position - see the thinning above. */
function hash01(x, y, z) {
  const h = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
  return h - Math.floor(h);
}

/**
 * Weak signal around the specimen, falling away smoothly.
 *
 * Smooth rather than the hash noise the voxels session uses: there the point
 * is that the background is noise, here it is that the block is full and the
 * signal fades. One gradient shows the second far better than speckle does.
 */
function backgroundGradient(x, y, z) {
  // Flattened along y to follow the specimen, and tuned so the far corners of
  // the block fall below the ramp entirely - otherwise every voxel in the box
  // clears the threshold and the result is a solid haze with a flower buried
  // somewhere inside it.
  const r = Math.hypot(x, y * 1.6, z);
  return 0.30 * Math.exp(-(r * r) / 1.0);
}

/** Arrow glyphs on a coarse lattice, coloured by speed. */
function buildVectors() {
  const B = shape.BOUNDS;
  const group = new THREE.Group();
  const n = 9;
  const spacing = (2 * B.x) / (n - 1);
  const v = new THREE.Vector3();
  const FIELD = [palette.teal, palette.amber, palette.accent];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      for (let k = 0; k < n; k++) {
        const x = -B.x + (i / (n - 1)) * 2 * B.x;
        const y = -B.y + (j / (n - 1)) * 2 * B.y;
        const z = -B.z + (k / (n - 1)) * 2 * B.z;
        shape.flowAt(x, y, z, v);
        const speed = v.length();
        if (speed < shape.FLOW_FLOOR) continue;   // masked: no transport here
        const t = Math.min(1, speed / shape.MAX_SPEED);
        const len = spacing * 0.9 * Math.max(0.3, t);
        group.add(new THREE.ArrowHelper(
          v.clone().normalize(),
          new THREE.Vector3(x, y, z),
          len,
          ramp(FIELD, t).getHex(),
          len * 0.38, len * 0.24,
        ));
      }
    }
  }
  // The specimen stays as a ghost: the field is transport *through* it, not a
  // fifth unrelated object that happens to share the box.
  group.add(new THREE.Mesh(
    shape.geometry(28),
    new THREE.MeshStandardMaterial({
      color: 0x9a9aa4, roughness: 0.9, transparent: true, opacity: 0.16,
      depthWrite: false,
    }),
  ));
  return group;
}
