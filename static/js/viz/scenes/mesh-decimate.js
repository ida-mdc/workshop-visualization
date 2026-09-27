// Real decimation, on a real scan.
//
// The Stanford 3D Scanning Repository's Armadillo: a laser scan of a small
// bronze figure, outstretched claws, curled snout, one raised ear - plenty
// of thin, non-convex detail to lose. Every level below is real quadric edge
// collapse (open3d, the same algorithm MeshLab uses) run on that mesh, not
// the cruder vertex-clustering the deck's other mesh figure shows - see
// tools/make-armadillo-mesh.py for exactly how.
//
// Drag the slider and watch what goes first: the fine shell texture, because
// it is where two close triangles cost little to weld. The pose survives
// past the point the surface has stopped looking like a scan at all - a real
// edge collapse spends its triangle budget on the outline for exactly as
// long as it can afford to.

import { defineScene, THREE } from '../runtime.js';

const LEVELS = 5;                       // level-0.bin .. level-4.bin, fine to coarse
const BASE = '../../../data/armadillo/';

/** Read one level's binary layout: header, positions, normals, indices. */
async function loadLevel(i) {
  const res = await fetch(new URL(`${BASE}level-${i}.bin`, import.meta.url));
  const buf = await res.arrayBuffer();
  const head = new Uint32Array(buf, 0, 2);
  const vertexCount = head[0];
  const indexCount = head[1];
  let offset = 8;
  const positions = new Float32Array(buf, offset, vertexCount * 3);
  offset += vertexCount * 3 * 4;
  const normals = new Float32Array(buf, offset, vertexCount * 3);
  offset += vertexCount * 3 * 4;
  const indices = new Uint32Array(buf, offset, indexCount);
  return { positions, normals, indices, triangles: indexCount / 3 };
}

defineScene('mesh-decimate', ({ scene, ui, view }) => {
  view(1.3, 0.9, 1.7, 1.05);

  const surface = new THREE.Mesh(
    new THREE.BufferGeometry(),
    new THREE.MeshStandardMaterial({
      color: '#8a7f6e', roughness: 0.55, metalness: 0.15,
      flatShading: true, side: THREE.DoubleSide,
    }),
  );
  scene.add(surface);

  const wire = new THREE.LineSegments(new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({ color: '#3c352a', transparent: true, opacity: 0.28 }));
  wire.visible = false;
  scene.add(wire);

  const levels = new Array(LEVELS).fill(null);
  const report = ui.readout('Triangles');

  function show(i) {
    const level = levels[i];
    if (!level) return;

    surface.geometry.dispose();
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(level.positions, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(level.normals, 3));
    geo.setIndex(new THREE.BufferAttribute(level.indices, 1));
    surface.geometry = geo;

    wire.geometry.dispose();
    wire.geometry = new THREE.WireframeGeometry(geo);

    report(`${level.triangles.toLocaleString('en')} triangles`);
  }

  const detail = ui.slider('Detail', {
    min: 0, max: LEVELS - 1, step: 1, value: 0,
    format: (v) => (levels[v] ? `${levels[v].triangles.toLocaleString('en')} triangles` : '…'),
  }, (v) => show(v));

  ui.toggle('Wireframe', false, (on) => { wire.visible = on; });

  Promise.all([...Array(LEVELS).keys()].map(loadLevel)).then((loaded) => {
    loaded.forEach((level, i) => { levels[i] = level; });
    show(0);
    detail.set(0);
  });
});
