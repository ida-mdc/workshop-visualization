// Two ways to cut a mesh open, and why the difference matters.
//
//   Clipping plane   the renderer throws away fragments on one side of a
//                    plane. The mesh is untouched - move the plane, move the
//                    cut, and the file on disk never changes. Free, instant,
//                    and it cannot be exported.
//
//   Boolean cut      the geometry itself is cut. The result is a new mesh you
//                    can save, measure and hand to a printer. It also loses
//                    the triangles you removed, permanently.
//
// The cut face is the tell. A clipping plane leaves the interior open and you
// see through to the far wall; a boolean cut leaves the same hole unless the
// cutter is a closed solid that can contribute a cap. That is why Blender's
// boolean modifier wants a closed cube rather than a plane, and it is the
// single most common thing to get wrong on a first attempt.

import { defineScene, THREE, palette } from '../runtime.js';
import * as shape from '../shape.js';

defineScene('cut-modes', ({ scene, ui, view }) => {
  view(3.4, 1.2, 3.8, 1.12);

  const full = shape.geometry(56);
  const plane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);

  const material = new THREE.MeshPhysicalMaterial({
    vertexColors: true, roughness: 0.35, clearcoat: 0.4,
    clearcoatRoughness: 0.4,
    // DoubleSide so the inside of the far wall is drawn. Without it a cut
    // object looks hollow and inside-out, which is a rendering artefact
    // people routinely mistake for a broken mesh.
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(full, material);
  scene.add(mesh);

  // The cutting plane, shown as what it is: a plane, not a box.
  const sheet = new THREE.Mesh(
    new THREE.PlaneGeometry(2.0, 1.7),
    new THREE.MeshBasicMaterial({
      color: palette.teal, transparent: true, opacity: 0.11,
      side: THREE.DoubleSide, depthWrite: false,
    }),
  );
  sheet.rotation.y = Math.PI / 2;
  scene.add(sheet);

  let mode = 0;      // 0 clipping plane, 1 boolean
  let at = 0.0;
  const report = ui.readout('Triangles');

  /** Drop every triangle whose centroid is past the plane. A real edit. */
  function booleanCut(x) {
    const src = full.toNonIndexed();
    const pos = src.attributes.position;
    const col = src.attributes.color;
    const keptPos = [];
    const keptCol = [];
    for (let t = 0; t < pos.count; t += 3) {
      const cx = (pos.getX(t) + pos.getX(t + 1) + pos.getX(t + 2)) / 3;
      if (cx > x) continue;
      for (let v = 0; v < 3; v++) {
        keptPos.push(pos.getX(t + v), pos.getY(t + v), pos.getZ(t + v));
        keptCol.push(col.getX(t + v), col.getY(t + v), col.getZ(t + v));
      }
    }
    src.dispose();
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(keptPos, 3));
    out.setAttribute('color', new THREE.Float32BufferAttribute(keptCol, 3));
    out.computeVertexNormals();
    return { geometry: out, triangles: keptPos.length / 9 };
  }

  function apply() {
    if (mesh.geometry !== full) mesh.geometry.dispose();
    sheet.position.x = at;

    if (mode === 0) {
      mesh.geometry = full;
      plane.constant = at;
      material.clippingPlanes = [plane];
      report(`${(full.index.count / 3).toLocaleString('en')} · mesh untouched`);
    } else {
      material.clippingPlanes = null;
      const out = booleanCut(at);
      mesh.geometry = out.geometry;
      report(`${out.triangles.toLocaleString('en')} · geometry changed`);
    }
    material.needsUpdate = true;
  }

  ui.choice('Cut by', ['Clipping plane (view only)', 'Boolean (edits the mesh)'],
    (i) => { mode = i; apply(); });

  ui.slider('Position', {
    min: -1.1, max: 1.1, step: 0.01, value: 0,
    format: (v) => v.toFixed(2),
  }, (v) => { at = v; apply(); });

  ui.toggle('Show the plane', true, (on) => { sheet.visible = on; });
});
