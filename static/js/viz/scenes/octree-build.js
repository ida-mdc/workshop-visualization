// What "octree" means: watching one get built, around a real surface.
//
// The data is the Armadillo's real triangle surface (Stanford 3D Scanning
// Repository) - see tools/make-armadillo-voxels.py, which voxelizes that
// surface (not its interior) at a fixed 64^3 resolution and ships which
// cells it actually touches. A surface has almost no volume, so only about
// 4% of the cube ends up occupied: a thin shell hugging the pose, not a
// filled solid. That is the case an octree is for - a dense CT volume like
// the frog's would fill most of its box, and gets a chunk grid instead (see
// "Dense grids and hierarchical trees").
//
// The rule, applied depth by depth: an occupied cell splits into eight
// smaller cells (octo- is eight, the root shared with octopus and October).
// A cell with nothing in it stops right there, however coarse, and nothing
// below it is ever built. Drag the depth slider and watch the armadillo's
// shape emerge from boxes while the empty air around it - most of the cube -
// stays a handful of large ones the whole way through.

import { defineScene, THREE, palette } from '../runtime.js';

const SPAN = 1.0;           // root cube side - matches the voxelizer's [-0.5, 0.5]^3
const MAX_DEPTH = 6;        // 2**MAX_DEPTH must equal the voxel grid resolution N
const GAP = 0.94;
const DATA = '../../../data/armadillo-voxels.bin';

/** tools/make-armadillo-voxels.py's file: uint32 N, then N^3 bits, x slowest. */
async function loadOccupancy() {
  const buf = await fetch(new URL(DATA, import.meta.url)).then((r) => r.arrayBuffer());
  const n = new Uint32Array(buf, 0, 1)[0];
  const packed = new Uint8Array(buf, 4);
  const occ = new Uint8Array(n * n * n);
  for (let i = 0; i < occ.length; i++) {
    const byte = packed[i >> 3];
    occ[i] = (byte >> (7 - (i & 7))) & 1;
  }
  return { n, occ };
}

/** Does any voxel in this cell's index range touch the surface? */
function touchesSurface(occ, n, i0, j0, k0, cells) {
  for (let i = 0; i < cells; i++) {
    const gi = i0 + i;
    for (let j = 0; j < cells; j++) {
      const gj = j0 + j;
      const row = (gi * n + gj) * n;
      for (let k = 0; k < cells; k++) {
        if (occ[row + k0 + k]) return true;
      }
    }
  }
  return false;
}

/**
 * Every leaf down to `maxDepth`: a touching cell subdivides one level
 * further; a cell that stops touching, or hits maxDepth, becomes a leaf.
 */
function buildLeaves({ n, occ }, maxDepth) {
  const leaves = [];
  function recurse(center, half, i0, j0, k0, cells, depth) {
    const occupied = touchesSurface(occ, n, i0, j0, k0, cells);
    if (depth === maxDepth || !occupied) {
      leaves.push({ center: center.clone(), half, occupied });
      return;
    }
    const h = half / 2;
    const c = cells / 2;
    for (const sx of [0, 1]) {
      for (const sy of [0, 1]) {
        for (const sz of [0, 1]) {
          recurse(
            new THREE.Vector3(
              center.x + (sx ? h : -h),
              center.y + (sy ? h : -h),
              center.z + (sz ? h : -h),
            ),
            h, i0 + sx * c, j0 + sy * c, k0 + sz * c, c, depth + 1,
          );
        }
      }
    }
  }
  recurse(new THREE.Vector3(0, 0, 0), SPAN / 2, 0, 0, 0, n, 0);
  return leaves;
}

defineScene('octree-build', (ctx) => {
  const { scene, ui, view } = ctx;
  view(1.1, 0.75, 1.45, 1.05);

  const solids = new THREE.Group();
  const wires = new THREE.Group();
  scene.add(solids, wires);

  let report; // assigned below, after the slider - see the note by depthSlider
  let grid = null;

  function rebuild(depth) {
    if (!grid) return;
    for (const g of [solids, wires]) {
      g.traverse((c) => { if (c !== g) { c.geometry?.dispose(); c.material?.dispose(); } });
      g.clear();
    }

    const leaves = buildLeaves(grid, depth);
    const occupied = leaves.filter((l) => l.occupied);
    const empty = leaves.filter((l) => !l.occupied);

    if (occupied.length) {
      const geo = new THREE.BoxGeometry(1, 1, 1);
      const mat = new THREE.MeshStandardMaterial({ color: palette.teal, roughness: 0.55 });
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
        new THREE.LineBasicMaterial({ color: palette.grey, transparent: true, opacity: 0.18 }),
      );
      box.position.copy(l.center);
      wires.add(box);
    }

    const fullGrid = 8 ** depth;
    report(`${occupied.length.toLocaleString('en')} occupied leaves, `
      + `${empty.length.toLocaleString('en')} empty ones`);
  }

  // Created before the readout, on purpose: the control bar lays these out
  // left to right in creation order, and the readout's text changes length
  // with every rebuild. Slider first keeps the slider itself in a fixed
  // spot - readout first made it jump sideways as the count's digit count
  // changed underneath the user's cursor.
  const depthSlider = ui.slider('Depth', {
    min: 0, max: MAX_DEPTH, step: 1, value: 5, format: (v) => `${v}`,
  }, (v) => rebuild(v));
  report = ui.readout('Leaves');

  loadOccupancy().then((loaded) => {
    grid = loaded;
    depthSlider.set(5);
  });
});
