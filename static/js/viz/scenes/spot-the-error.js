// "Deriving information": rendering as quality control.
//
// This segmentation has a hole punched through one petal and a detached
// fragment floating beside it - the kind of thing a threshold does when a
// neighbouring structure is a little too bright. The volume you would report
// is off by under two percent, which is well inside what anyone would accept
// from a summary statistic, and a single slice through the middle misses both.
// Looking at the thing in 3D takes a second and settles it.

import { defineScene, THREE, palette } from '../runtime.js';
import * as shape from '../shape.js';

/** Centre and radius of the bite taken out of one petal. */
const HOLE_AT = shape.petalPoint(0.55);
const HOLE_R = 0.18;

/** The fragment the threshold left behind, off on its own. */
const FRAGMENT_AT = shape.petalPoint(1.45, 3).setY(0.15);
const FRAGMENT_R = 0.11;

defineScene('spot-the-error', ({ scene, ui, view }) => {
  view(3.9, 1.5, 3.6, shape.FIT_RADIUS);

  // One flat tone rather than the tinted tissue: the job of this scene is to
  // make two defects findable, and per-part colour is visual noise against it.
  const material = new THREE.MeshStandardMaterial({
    color: palette.rose, roughness: 0.55, side: THREE.DoubleSide,
  });

  scene.add(new THREE.Mesh(punched(), material));

  const fragment = new THREE.Mesh(
    new THREE.SphereGeometry(FRAGMENT_R, 24, 16),
    material,
  );
  fragment.position.copy(FRAGMENT_AT);
  scene.add(fragment);

  // Markers, off by default: the slide works better if the room finds them.
  const marks = new THREE.Group();
  marks.visible = false;
  scene.add(marks);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(HOLE_R * 1.5, 0.022, 10, 40),
    new THREE.MeshBasicMaterial({ color: palette.blue }),
  );
  ring.position.copy(HOLE_AT);
  ring.lookAt(HOLE_AT.clone().add(new THREE.Vector3(0, 1, 0)));
  marks.add(ring);

  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(FRAGMENT_R * 2.4, 20, 14),
    new THREE.MeshBasicMaterial({
      color: palette.blue, transparent: true, opacity: 0.3, depthWrite: false,
    }),
  );
  halo.position.copy(FRAGMENT_AT);
  marks.add(halo);

  ui.toggle('Mark the defects', false, (on) => { marks.visible = on; });
});

/**
 * The specimen with every triangle near HOLE_AT dropped.
 *
 * The petal is thin, so a sphere centred on it removes both of its skins and
 * leaves a hole you can see straight through - which is what makes it
 * findable from some angles and invisible from others.
 */
function punched() {
  const source = shape.geometry(56).toNonIndexed();
  const pos = source.attributes.position;
  const kept = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const centroid = new THREE.Vector3();
  const r2 = HOLE_R * HOLE_R;
  for (let t = 0; t < pos.count; t += 3) {
    a.fromBufferAttribute(pos, t);
    b.fromBufferAttribute(pos, t + 1);
    c.fromBufferAttribute(pos, t + 2);
    centroid.copy(a).add(b).add(c).divideScalar(3);
    if (centroid.distanceToSquared(HOLE_AT) < r2) continue;
    kept.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(kept, 3));
  out.computeVertexNormals();
  source.dispose();
  return out;
}
