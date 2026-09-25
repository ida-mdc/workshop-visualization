// Spacing is metadata, and what happens when it is missing.
//
// Drawn as boxes rather than ray marched: the point is the shape of one voxel,
// and a box whose faces you can see says it better than a rendering.
//
// Coarsened along z, the nose-to-tail axis. In the pose this session shows the
// frog in - a quarter turn about x, nose up, back to the camera - z is the
// vertical axis on screen, so coarsening it squashes the animal top to bottom
// where you can see it. The scan's own slice axis is y, which in this pose
// points straight into the screen: coarsening that is invisible, the isotropic
// and the 3x projections come out identical.

import {
  defineScene, THREE, ramp, panelStrip, spreadPanels, panelOrbit,
} from '../runtime.js';
import { loadScan, makeSampler, EXTENT, BANDS, shade } from '../scan.js';
import { bucketedVoxels, acquisitionBox, opacityRamp, MIN_ALPHA } from '../voxels.js';

const B = EXTENT;
const GRID = 44;                 // across x
const COARSE = 3;                // how much coarser the slice axis gets
const SUB = 2;                   // box-average width, so noise does not alias
const THRESHOLD = BANDS.skin + 0.03;

// Warm greys, matching the specimen everywhere else in the session.
const VALUE = ['#3b3f47', '#6f7681', '#a9a49b', '#e4dbc9', '#ffffff'];

const CASES = [
  { factor: 1, declared: true, title: 'as acquired',
    body: 'Isotropic - the voxel is a cube.' },
  { factor: COARSE, declared: true, title: '3× fewer slices',
    body: 'The voxel is a box, and the viewer is told so.' },
  { factor: COARSE, declared: false, title: 'coarser, not declared',
    body: 'Same data, spacing missing. Drawn as cubes, the frog is flattened.' },
];

defineScene('voxel-spacing', (ctx) => {
  const { scene, projection, frustum, view, controls } = ctx;
  const camera = projection('orthographic');
  frustum(1.15, 4.4);
  view(0, 0, 3.4);
  controls.enabled = false;
  for (let i = 1; i <= CASES.length; i++) camera.layers.enable(i);

  panelStrip(ctx.el, CASES.map((c) => ({ title: c.title, body: c.body })),
    { numbered: false });

  const groups = CASES.map(() => {
    const g = new THREE.Group();
    scene.add(g);
    return g;
  });

  loadScan().then((texture) => {
    const sample = makeSampler(texture.image.data);

    CASES.forEach((c, i) => {
      const step = (2 * B.x) / GRID;
      const zStep = step * c.factor;
      const ny = Math.max(1, Math.round((2 * B.y) / step));
      const nz = Math.max(1, Math.round((2 * B.z) / zStep));
      // A voxel is drawn as long as it was sampled - unless nobody wrote that
      // down, in which case it is drawn as a cube and the block collapses.
      const depth = c.declared ? zStep : step;
      const zScale = c.declared ? 1 : 1 / c.factor;

      const inv = 1 / (SUB * SUB * SUB);
      const samples = [];
      for (let x = 0; x < GRID; x++) {
        const x0 = -B.x + x * step;
        for (let j = 0; j < ny; j++) {
          const y0 = -B.y + j * step;
          for (let k = 0; k < nz; k++) {
            const z0 = -B.z + k * zStep;
            let acc = 0;
            for (let cc = 0; cc < SUB; cc++) {
              const z = z0 + ((cc + 0.5) / SUB) * zStep;
              for (let b = 0; b < SUB; b++) {
                const y = y0 + ((b + 0.5) / SUB) * step;
                for (let a = 0; a < SUB; a++) {
                  acc += sample(x0 + ((a + 0.5) / SUB) * step, y, z);
                }
              }
            }
            const v = acc * inv;
            const alpha = opacityRamp(v, THRESHOLD, 0);
            if (alpha < MIN_ALPHA) continue;
            samples.push(x0 + step / 2, y0 + step / 2,
              (z0 + zStep / 2) * zScale, v, alpha);
          }
        }
      }

      const panel = groups[i];

      // The angle the pose is seen from. panelOrbit writes to panel.rotation
      // every frame, so it cannot live there.
      const swing = new THREE.Group();
      swing.rotation.y = -0.62;
      panel.add(swing);

      // The same quarter turn the rest of the session uses: nose up, back to
      // the camera.
      const tilt = new THREE.Group();
      tilt.rotation.x = Math.PI / 2;
      swing.add(tilt);

      tilt.add(bucketedVoxels({
        samples,
        size: { x: step, y: step, z: depth },
        colorFor: (v) => ramp(VALUE, shade(v)),
      }));
      tilt.add(acquisitionBox(B, { x: 1, y: 1, z: zScale }));

      panel.traverse((o) => o.layers.set(i + 1));
    });
  });

  const orbit = panelOrbit(ctx, groups);
  return {
    tick: () => {
      spreadPanels(camera, groups);
      orbit();
    },
  };
});
