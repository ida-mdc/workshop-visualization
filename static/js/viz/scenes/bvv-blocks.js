// How BigVolumeViewer renders a volume larger than the GPU can hold.
//
// No octree. BVV inherits BigDataViewer's resolution pyramid and its CPU
// cache, and adds a GPU tier: one large 3D texture cut into small uniform
// blocks - 32 voxels on a side, padded by one voxel so that trilinear
// interpolation cannot bleed between neighbours. Each texture block holds one
// block of the volume at one level of the pyramid. Blocks are evicted
// least-recently-used.
//
// What it does per frame, from bvv-core's VolumeBlocks:
//
//   1. Pick a BASE LEVEL so that screen resolution is matched for the nearest
//      visible voxel.
//   2. assignBestLevels: give every required block its own best level, from
//      the distance of the block's centre to the viewer. Near blocks want
//      fine data, far blocks want coarse.
//   3. makeLut: for each block, look for its best level in the GPU cache. If
//      it is not there, walk TOWARDS COARSER levels until something resident
//      turns up, and put that in the lookup texture instead.
//   4. Anything substituted, or still incomplete, makes makeLut return false,
//      and the frame is repainted until every block is there at the level it
//      asked for.
//
// So the blur-then-sharpen is not a scheduled coarse-to-fine pass over the
// whole volume. Every block asks for the level its distance calls for; what
// changes over time is how many of them have got it. That is what the second
// slider shows - drag it and blocks climb to their own target and stop, near
// ones last because they are asking for the most data.

import { defineScene, THREE, ramp } from '../runtime.js';
import { makeEye } from '../eye.js';

const GRID = 6;             // blocks per axis
const SPAN = 2.4;           // world size of the whole volume

// One color per resolution level, coarse to fine.
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
  // How far the repainting has got, 0 to 1. At 0 every block is drawn from the
  // coarsest data; at 1 every block has the level its distance asked for.
  let arrived = 1;

  const report = ui.readout('At the level they asked for');

  /**
   * The level this block's distance calls for, coarsest 0 to finest 3.
   *
   * BVV picks per block by projected voxel size, which halves every time the
   * distance doubles - so the level steps with the logarithm of the distance.
   * Spread over the range of distances actually in the frame, because the
   * observer here stands off the volume rather than inside it, and at that
   * standoff a true doubling only ever reaches two of the four levels.
   */
  function bestLevel(d, near, far) {
    const t = (Math.log(d) - Math.log(near)) / (Math.log(far) - Math.log(near) || 1);
    const step = Math.min(LEVELS.length - 1, Math.floor(t * LEVELS.length));
    return LEVELS.length - 1 - step;
  }

  function rebuild() {
    resident.traverse((c) => {
      if (c !== resident) { c.geometry?.dispose(); c.material?.dispose(); }
    });
    resident.clear();

    // Every block asks for the level its distance calls for. Until that level
    // has arrived it is drawn from the coarsest data that has, which is what
    // makeLut does when it walks towards coarser levels on a miss.
    const byLevel = [[], [], [], []];
    let settled = 0;
    const reached = Math.floor(arrived * LEVELS.length);
    const dist = blocks.map((b) => b.centre.distanceTo(eye.position));
    const near = Math.min(...dist);
    const far = Math.max(...dist);
    for (const [n, b] of blocks.entries()) {
      const want = bestLevel(dist[n], near, far);
      const have = Math.min(want, reached);
      if (have === want) settled++;
      byLevel[have].push(b);
    }

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

    report(`${settled} of ${blocks.length} blocks`);
  }

  ui.slider('Camera position', {
    min: -Math.PI, max: Math.PI, step: 0.02, value: angle, format: () => '',
  }, (v) => { angle = v; eye.place(angle, 0.5, 2.6); rebuild(); });

  ui.slider('Blocks arrived', {
    min: 0, max: 1, step: 0.02, value: arrived, format: () => '',
  }, (v) => { arrived = v; rebuild(); });

  eye.place(angle, 0.5, 2.6);
  rebuild();
});
