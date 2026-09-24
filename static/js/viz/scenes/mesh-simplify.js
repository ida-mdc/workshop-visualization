// Reducing mesh complexity, and what it costs.
//
// This is real decimation, not a coarser tessellation: vertex clustering. Lay
// a grid over the mesh, weld every vertex in a cell to that cell's average,
// then throw away triangles whose corners have collapsed onto each other. It
// is the crudest useful method - MeshLab's quadric edge collapse keeps shape
// far better at the same budget - and that is why it is instructive. Its
// failure mode is the failure mode of all of them, only sooner.
//
// A snowflake because the damage is legible on it. Thin branches and the small
// plates at their tips are exactly the features a cell grid welds away, so you
// can watch the silhouette lose its detail while the trunk is still fine. On a
// sphere you would see nothing until it turned into a die.

import { defineScene, THREE, palette } from '../runtime.js';
import * as snowflake from '../snowflake.js';

/**
 * Vertex-cluster `geo` onto a grid of `cell`.
 *
 * Averaging the vertices in a cell rather than snapping them to its centre is
 * what stops the result looking like Minecraft: the welded vertex sits where
 * the surface actually was.
 */
function cluster(geo, cell) {
  const src = geo.index ? geo.toNonIndexed() : geo;
  const pos = src.attributes.position;
  const cells = new Map();     // grid key -> index into sums
  const sums = [];             // x, y, z, count per welded vertex
  const tris = [];

  const weld = (x, y, z) => {
    const key = `${Math.round(x / cell)},${Math.round(y / cell)},${Math.round(z / cell)}`;
    let n = cells.get(key);
    if (n === undefined) {
      n = sums.length / 4;
      cells.set(key, n);
      sums.push(0, 0, 0, 0);
    }
    sums[n * 4] += x;
    sums[n * 4 + 1] += y;
    sums[n * 4 + 2] += z;
    sums[n * 4 + 3] += 1;
    return n;
  };

  for (let t = 0; t < pos.count; t += 3) {
    const a = weld(pos.getX(t), pos.getY(t), pos.getZ(t));
    const b = weld(pos.getX(t + 1), pos.getY(t + 1), pos.getZ(t + 1));
    const c = weld(pos.getX(t + 2), pos.getY(t + 2), pos.getZ(t + 2));
    // Two corners in the same cell means the triangle has no area left.
    if (a !== b && b !== c && a !== c) tris.push(a, b, c);
  }
  if (src !== geo) src.dispose();

  const count = sums.length / 4;
  const positions = new Float32Array(count * 3);
  for (let n = 0; n < count; n++) {
    const w = sums[n * 4 + 3];
    positions[n * 3] = sums[n * 4] / w;
    positions[n * 3 + 1] = sums[n * 4 + 1] / w;
    positions[n * 3 + 2] = sums[n * 4 + 2] / w;
  }

  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  out.setIndex(tris);
  out.computeVertexNormals();
  return { geometry: out, triangles: tris.length / 3, vertices: count };
}

defineScene('mesh-simplify', ({ scene, ui, view }) => {
  view(1.5, 2.5, 2.1, 1.18);

  const full = snowflake.geometry(40);
  const fullTriangles = full.index.count / 3;

  const surface = new THREE.Mesh(full, new THREE.MeshPhysicalMaterial({
    color: palette.ice, roughness: 0.28, clearcoat: 0.6,
    clearcoatRoughness: 0.25, side: THREE.DoubleSide, flatShading: true,
  }));
  scene.add(surface);

  const wire = new THREE.LineSegments(new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({
      color: palette.iceDeep, transparent: true, opacity: 0.35,
    }));
  scene.add(wire);

  let cell = 0;          // 0 means "no simplification"
  let wireframe = false;
  const report = ui.readout('Triangles');

  function rebuild() {
    if (surface.geometry !== full) surface.geometry.dispose();
    wire.geometry.dispose();

    let triangles = fullTriangles;
    if (cell <= 0) {
      surface.geometry = full;
    } else {
      const out = cluster(full, cell);
      surface.geometry = out.geometry;
      triangles = out.triangles;
    }

    wire.geometry = wireframe
      ? new THREE.WireframeGeometry(surface.geometry)
      : new THREE.BufferGeometry();
    wire.visible = wireframe;

    const pct = Math.round((triangles / fullTriangles) * 100);
    report(`${triangles.toLocaleString('en')} · ${pct}% of original`);
  }

  ui.slider('Cluster size', {
    min: 0, max: 0.10, step: 0.005, value: 0,
    format: (v) => (v <= 0 ? 'original' : v.toFixed(3)),
  }, (v) => { cell = v; rebuild(); });

  ui.toggle('Wireframe', false, (on) => { wireframe = on; rebuild(); });
  ui.toggle('Flat shading', true, (on) => {
    surface.material.flatShading = on;
    surface.material.needsUpdate = true;
  });
});
