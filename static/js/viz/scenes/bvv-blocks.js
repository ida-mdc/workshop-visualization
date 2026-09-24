// How BigVolumeViewer renders a volume larger than the GPU can hold.
//
// The architecture, in one picture. BVV inherits BigDataViewer's resolution
// pyramid and its cache, and adds a GPU tier: one large 3D texture cut into
// small uniform blocks - 32 voxels on a side, padded by one voxel so that
// trilinear interpolation cannot bleed between neighbours. Each texture block
// holds one block of the volume at one level of the pyramid.
//
// To render a view, BVV picks a base resolution level so that screen
// resolution is matched for the nearest visible voxel, then builds a small 3D
// lookup texture saying, for every block of the volume, where in the cache
// texture its data currently sits. The ray marcher reads the lookup, then the
// cache. Blocks that have not arrived yet fall back to a coarser level that
// has, which is why a BVV view sharpens progressively instead of blocking.
//
// So three things decide what you see, and all three are exposed in the
// viewer's own settings: where the camera is, how much GPU memory the cache is
// allowed, and the block size. This scene makes the first two draggable.
//
// The observer is the glyph in the scene rather than your own camera, so you
// can orbit round and inspect how the detail is distributed.

import { defineScene, THREE, ramp } from '../runtime.js';
import { makeEye } from '../eye.js';

const GRID = 6;             // blocks per axis
const SPAN = 2.4;           // world size of the whole volume

// One colour per resolution level, coarse to fine.
const LEVELS = ['#d7e3ee', '#9dc0da', '#4a85b4', '#0d4a7a'];
const SUBDIV = [1, 2, 3, 4];   // samples per axis drawn, per level

defineScene('bvv-blocks', ({ scene, ui, view }) => {
  view(3.4, 2.4, 4.6, 2.5);

  // Small, and short enough that the frustum stops before the volume does.
  // At reach 2.2 it ran most of the way to the centre of the block grid and
  // read as part of the data rather than as the thing looking at it.
  const eye = makeEye({ reach: 0.45, spread: 0.5 });
  scene.add(eye.group);

  const step = SPAN / GRID;
  const half = SPAN / 2;

  // The volume's block structure, always visible: this is the grid the lookup
  // texture indexes, and the unit in which data arrives.
  const lattice = new THREE.Group();
  scene.add(lattice);
  const blocks = [];
  for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
      for (let k = 0; k < GRID; k++) {
        const centre = new THREE.Vector3(
          -half + (i + 0.5) * step,
          -half + (j + 0.5) * step,
          -half + (k + 0.5) * step,
        );
        blocks.push({ centre });
      }
    }
  }
  lattice.add(new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(SPAN, SPAN, SPAN)),
    new THREE.LineBasicMaterial({
      color: '#8f9aa6', transparent: true, opacity: 0.5,
    }),
  ));

  // Resident blocks, drawn as the samples they actually hold: one cube for the
  // coarsest level, up to 4x4x4 for the finest. Same block, more data.
  const resident = new THREE.Group();
  scene.add(resident);

  let angle = -0.7;
  // How many blocks the cache holds. Fixed rather than a slider: the slide is
  // about which blocks get loaded and at what level, and a second control
  // only invited the room to tune a number that is not the point.
  const cacheBlocks = 70;
  let showEmpty = true;

  const empties = new THREE.Group();
  scene.add(empties);

  function rebuild() {
    for (const g of [resident, empties]) {
      g.traverse((c) => { if (c !== g) { c.geometry?.dispose(); c.material?.dispose(); } });
      g.clear();
    }

    // Rank blocks by distance to the camera glyph. The nearest get the finest
    // level the cache can afford; the rest degrade, then drop out entirely.
    const ranked = blocks
      .map((b) => ({ b, d: b.centre.distanceTo(eye.position) }))
      .sort((a, b) => a.d - b.d);

    const byLevel = [[], [], [], []];
    const missing = [];

    ranked.forEach((entry, rank) => {
      if (rank >= cacheBlocks) { missing.push(entry.b); return; }
      // Nearest quarter of the budget at the finest level, then coarser.
      const share = rank / Math.max(1, cacheBlocks);
      const level = share < 0.18 ? 3 : share < 0.42 ? 2 : share < 0.72 ? 1 : 0;
      byLevel[level].push(entry.b);
    });

    byLevel.forEach((list, level) => {
      if (!list.length) return;
      const n = SUBDIV[level];
      const cell = step / n;
      const geo = new THREE.BoxGeometry(cell * 0.78, cell * 0.78, cell * 0.78);
      const mat = new THREE.MeshStandardMaterial({
        color: LEVELS[level], roughness: 0.55,
      });
      const mesh = new THREE.InstancedMesh(geo, mat, list.length * n * n * n);
      const m = new THREE.Matrix4();
      let at = 0;
      for (const b of list) {
        for (let i = 0; i < n; i++) {
          for (let j = 0; j < n; j++) {
            for (let k = 0; k < n; k++) {
              m.makeTranslation(
                b.centre.x - step / 2 + (i + 0.5) * cell,
                b.centre.y - step / 2 + (j + 0.5) * cell,
                b.centre.z - step / 2 + (k + 0.5) * cell,
              );
              mesh.setMatrixAt(at++, m);
            }
          }
        }
      }
      mesh.instanceMatrix.needsUpdate = true;
      resident.add(mesh);
    });

    if (showEmpty && missing.length) {
      // Blocks the cache could not fit. In the real viewer these are the ones
      // a ray falls back to a coarser level for, or waits for.
      const geo = new THREE.EdgesGeometry(
        new THREE.BoxGeometry(step * 0.9, step * 0.9, step * 0.9));
      const mat = new THREE.LineBasicMaterial({
        color: '#c8ccd4', transparent: true, opacity: 0.45,
      });
      for (const b of missing) {
        const l = new THREE.LineSegments(geo, mat);
        l.position.copy(b.centre);
        empties.add(l);
      }
    }
    empties.visible = showEmpty;
  }

  ui.slider('Camera position', {
    min: -Math.PI, max: Math.PI, step: 0.02, value: angle, format: () => '',
  }, (v) => { angle = v; eye.place(angle, 0.5, 2.6); rebuild(); });

  ui.toggle('Blocks not loaded', true, (on) => { showEmpty = on; rebuild(); });

  eye.place(angle, 0.5, 2.6);
  rebuild();
});
