// Three volumes, three scales, one drag.
//
// A whole frog head at 202 um, its tongue at 81 um, and a cube cut out of that
// tongue at 4 um. Same animal, same modality, three orders of magnitude.
//
// Each sits in a black box so the rendering has something to be seen against
// while the slide itself stays white.

import {
  defineScene, THREE, panelStrip, spreadPanels, panelOrbit,
} from '../runtime.js';
import { makeVolume, MODES } from '../volume.js';
import { loadScan, SHAPE as FROG_SHAPE, BOUNDS as FROG_BOUNDS, WINDOW } from '../scan.js';

const CUBE = 1.04;

// One starting angle, the same for all three. panelOrbit writes straight to
// each panel's rotation every frame, so the offset has to live on a group
// inside it - and it has to be identical, or the three sit at different angles
// and the comparison stops being one.
const START = { x: 0.24, y: -0.62 };

const PANELS = [
  {
    file: null, shape: FROG_SHAPE, bounds: FROG_BOUNDS, tilt: true,
    stops: ['#1c222c', '#5a6472', '#a8a59f', '#ece3d4', '#ffffff'],
    threshold: 0.10, width: 0.06, density: 0.55, window: WINDOW,
    title: 'the head', body: '202 µm voxels, 52 mm across',
  },
  {
    file: 'tongue-whole-160x88x142.raw', shape: [160, 88, 142],
    bounds: [0.5, 0.2754, 0.4444],
    stops: ['#6b4a24', '#a97c41', '#d9ab68', '#f0dcb4', '#fbeccd'],
    // Anchors rather than a rising shoulder. A shoulder makes the densest
    // tissue the most opaque, so the tip - the brightest thing in the scan -
    // filled every ray it was on and burned out while the body stayed dim.
    // This opens above the noise floor at 0.12, carries the body, and rolls
    // back off at the top so the tip stops saturating.
    points: [[0.10, 0], [0.16, 0.005], [0.30, 0.021], [0.50, 0.033],
      [0.70, 0.038], [0.88, 0.021], [1.0, 0.013]],
    window: [0.10, 0.75],
    title: 'its tongue', body: '130 µm voxels, 21 mm across',
  },
  {
    file: 'tongue-160x160x160.raw', shape: [160, 160, 160],
    bounds: [0.5, 0.5, 0.5],
    stops: ['#4b5563', '#79838f', '#a7b0bb', '#d5dbe2', '#ffffff'],
    // Solid tissue, no air: the bulk is 0.20 to 0.47 with its mode at 0.30.
    // Opening the ramp at 0.02 made every one of those fully opaque and the
    // cube became a wall. Putting the shoulder through the middle of the
    // distribution lets the darker tissue be seen through.
    window: [0.15, 0.78],
    threshold: 0.34, width: 0.16, density: 0.45, curve: 1.4,
    title: 'a block of it', body: '6.5 µm voxels, 1 mm across',
  },
];

function load(file, expected) {
  return fetch(new URL(`../../../data/${file}`, import.meta.url))
    .then((r) => r.arrayBuffer())
    .then((b) => {
      const d = new Uint8Array(b);
      if (d.length !== expected) throw new Error(`${file}: ${d.length} bytes`);
      return d;
    });
}

defineScene('voxel-cubes', (ctx) => {
  const { scene, projection, frustum, view, controls } = ctx;
  const camera = projection('orthographic');
  frustum(1.35, 5.0);
  view(0, 0, 3.4);
  controls.enabled = false;
  for (let i = 1; i <= PANELS.length; i++) camera.layers.enable(i);

  panelStrip(ctx.el, PANELS.map((p) => ({ title: p.title, body: p.body })),
    { numbered: false });

  // Created up front, filled when each volume arrives. panelOrbit holds this
  // array and touches every entry each frame, so it must never be sparse.
  const groups = PANELS.map(() => {
    const g = new THREE.Group();
    scene.add(g);
    return g;
  });

  PANELS.forEach((src, i) => {
    const [nx, ny, nz] = src.shape;
    const got = src.file ? load(src.file, nx * ny * nz) : loadScan();

    got.then((payload) => {
      const panel = groups[i];

      const stage = new THREE.Group();
      stage.rotation.set(START.x, START.y, 0);
      panel.add(stage);

      // The frog's own axes need a quarter turn to sit upright; the two cubes
      // do not. A cube looks the same either way, so this changes what is
      // inside the box and not how the box sits.
      const spun = new THREE.Group();
      if (src.tilt) spun.rotation.x = Math.PI / 2;
      stage.add(spun);

      // One cube, the same for all three, drawn first. Every volume here has
      // a longest half-extent of 0.5, so they all sit inside it - and three
      // equal cubes is the picture, not three different boxes.
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(CUBE, CUBE, CUBE),
        new THREE.MeshBasicMaterial({ color: '#04060a', side: THREE.BackSide }),
      );
      box.renderOrder = -1;
      spun.add(box);

      // Its edges, or the cube reads as a flat dark shape: the interior is
      // one colour and an unlit box gives the eye nothing to find corners by.
      spun.add(new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(CUBE, CUBE, CUBE)),
        new THREE.LineBasicMaterial({ color: '#6f7885' }),
      ));

      const shared = payload instanceof Uint8Array ? null : payload;
      const volume = makeVolume(spun, {
        shape: src.shape,
        bounds: src.bounds,
        stops: src.stops,
        texture: shared,
        threshold: src.threshold,
        width: src.width,
        density: src.density,
        window: src.window,
        points: src.points || null,
        curve: src.curve || 1,
        steps: 300,
        shade: 0,
        ambient: 1,
        mode: MODES['Emission-absorption'],
      });
      if (!shared) volume.update(payload);

      panel.traverse((o) => o.layers.set(i + 1));
    }).catch((err) => console.error('voxel-cubes:', src.file, err));
  });

  const orbit = panelOrbit(ctx, groups);
  return {
    tick: () => {
      spreadPanels(camera, groups);
      orbit();
    },
  };
});
