// What "octree" means: watching one get built.
//
// The data is a thin hollow shell - empty inside, empty outside, a wall in
// between. That is deliberately three kinds of region, because an octree
// exists to tell them apart.
//
// The rule, applied depth by depth: a cell that the shell passes through
// splits into eight smaller cells (octo- is eight, the same root as octopus
// and October). A cell the shell misses entirely stops right there, however
// coarse, and is never looked at again. Drag the slider and watch it happen:
// the wall keeps splitting into finer boxes; the inside and the outside stay
// two big empty ones the whole time.
//
// That is the entire saving. A dense grid at the wall's finest resolution
// would need that many cells everywhere, including the parts that are air.
// The readout says both numbers, so the gap is a fact on screen rather than
// a claim in the text.

import { defineScene, THREE, palette } from '../runtime.js';

const R_OUT = 0.62;         // outer radius of the shell
const SHELL = 0.16;         // shell thickness
const R_IN = R_OUT - SHELL;
const SPAN = 1.6;           // side of the root cube
const MAX_DEPTH = 4;
const GAP = 0.94;           // solid cells drawn slightly smaller, so edges read

/** Does the cube at `center` with half-side `half` touch the shell at all? */
function touchesShell(center, half) {
  const dx = Math.max(Math.abs(center.x) - half, 0);
  const dy = Math.max(Math.abs(center.y) - half, 0);
  const dz = Math.max(Math.abs(center.z) - half, 0);
  const near = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const fx = Math.abs(center.x) + half;
  const fy = Math.abs(center.y) + half;
  const fz = Math.abs(center.z) + half;
  const far = Math.sqrt(fx * fx + fy * fy + fz * fz);
  return near <= R_OUT && far >= R_IN;
}

/**
 * Every leaf down to `maxDepth`: a touching cell subdivides one level
 * further; a cell that stops touching, or hits maxDepth, becomes a leaf.
 */
function buildLeaves(maxDepth) {
  const leaves = [];
  function recurse(center, half, depth) {
    if (depth === maxDepth || !touchesShell(center, half)) {
      leaves.push({ center, half, occupied: touchesShell(center, half) });
      return;
    }
    const h = half / 2;
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        for (const sz of [-1, 1]) {
          recurse(
            new THREE.Vector3(center.x + sx * h, center.y + sy * h, center.z + sz * h),
            h, depth + 1,
          );
        }
      }
    }
  }
  recurse(new THREE.Vector3(0, 0, 0), SPAN / 2, 0);
  return leaves;
}

defineScene('octree-build', (ctx) => {
  const { scene, ui, view } = ctx;
  view(1.5, 1.05, 2.0, 1.55);

  const solids = new THREE.Group();
  const wires = new THREE.Group();
  scene.add(solids, wires);

  const report = ui.readout('Leaves');

  function rebuild(depth) {
    for (const g of [solids, wires]) {
      g.traverse((c) => { if (c !== g) { c.geometry?.dispose(); c.material?.dispose(); } });
      g.clear();
    }

    const leaves = buildLeaves(depth);
    const occupied = leaves.filter((l) => l.occupied);
    const empty = leaves.filter((l) => !l.occupied);

    if (occupied.length) {
      const geo = new THREE.BoxGeometry(1, 1, 1);
      const mat = new THREE.MeshStandardMaterial({ color: palette.blue, roughness: 0.55 });
      const mesh = new THREE.InstancedMesh(geo, mat, occupied.length);
      const m = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const scl = new THREE.Vector3();
      occupied.forEach((l, i) => {
        scl.setScalar(l.half * 2 * GAP);
        m.compose(l.center, q, scl);
        mesh.setMatrixAt(i, m);
      });
      mesh.instanceMatrix.needsUpdate = true;
      solids.add(mesh);
    }

    const edgeGeoCache = new Map();
    for (const l of empty) {
      const side = (l.half * 2).toFixed(4);
      if (!edgeGeoCache.has(side)) {
        edgeGeoCache.set(side, new THREE.EdgesGeometry(
          new THREE.BoxGeometry(l.half * 2, l.half * 2, l.half * 2)));
      }
      const box = new THREE.LineSegments(
        edgeGeoCache.get(side),
        new THREE.LineBasicMaterial({ color: palette.grey, transparent: true, opacity: 0.4 }),
      );
      box.position.copy(l.center);
      wires.add(box);
    }

    const fullGrid = 8 ** depth;
    report(`${occupied.length.toLocaleString('en')} occupied leaves, `
      + `${empty.length.toLocaleString('en')} empty ones · `
      + `a dense grid this fine would need ${fullGrid.toLocaleString('en')} cells everywhere`);
  }

  ui.slider('Depth', {
    min: 0, max: MAX_DEPTH, step: 1, value: 2, format: (v) => `${v}`,
  }, (v) => rebuild(v));

  rebuild(2);
});
