// "Understanding": a single projection is not enough.
//
// Two objects at different depths overlap on the image plane. Head-on they are
// drawn the way a camera records them - flat, unlit, one silhouette - and read
// as a single blob, because nothing in a projection distinguishes "in front
// of" from "part of". Rotate away, and you see both the two real objects *and*
// the flat grey blob they cast on the film: the collapse and its cause in the
// same picture.
//
// The camera is orthographic here, which makes the silhouettes exactly the
// objects' outlines rather than an approximation of them - and matches what a
// slice or a maximum intensity projection actually does to a volume.

import { defineScene, THREE, palette } from '../runtime.js';

const FILM_Z = -2.7;

const SPECIMENS = [
  { pos: [-0.52, 0.12, -1.45], radius: 0.95, color: palette.rose },
  { pos: [0.60, -0.10, 1.45], radius: 0.85, color: palette.teal },
];

// The ellipsoids are spheres squashed in y and stretched in z. Projected along
// z, that leaves an ellipse as wide as the sphere and 0.85 as tall.
const SQUASH_Y = 0.85;
const STRETCH_Z = 1.15;

defineScene('one-view-lies', ({ scene, ui, view, projection, frustum, controls }) => {
  projection('orthographic');

  const flat = new THREE.MeshBasicMaterial({ color: 0x8b8b96 });
  const bodies = SPECIMENS.map((spec) => {
    const lit = new THREE.MeshPhysicalMaterial({
      color: spec.color, roughness: 0.4, clearcoat: 0.4, clearcoatRoughness: 0.4,
    });
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(spec.radius, 48, 32), lit,
    );
    mesh.userData.lit = lit;
    mesh.position.set(...spec.pos);
    mesh.scale.set(1, SQUASH_Y, STRETCH_Z);
    scene.add(mesh);
    return mesh;
  });

  // The film: what the camera came away with. Both silhouettes are the same
  // flat grey, so where they overlap there is no edge - which is the whole
  // point. The recording has no idea it caught two objects.
  const film = new THREE.Group();
  film.position.z = FILM_Z;
  scene.add(film);

  film.add(new THREE.Mesh(
    new THREE.PlaneGeometry(4.6, 3.2),
    new THREE.MeshBasicMaterial({ color: 0xececf2 }),
  ));
  for (const spec of SPECIMENS) {
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(spec.radius, 48),
      flat,
    );
    disc.position.set(spec.pos[0], spec.pos[1], 0.004);
    disc.scale.set(1, SQUASH_Y, 1);
    film.add(disc);
  }

  ui.choice('Show', ['What the image records', 'What is actually there'], (i) => {
    for (const mesh of bodies) {
      mesh.material = i === 0 ? flat : mesh.userData.lit;
    }
    if (i === 0) {
      // Straight down the projection axis, where each object sits exactly on
      // top of its own silhouette.
      frustum(3.0);
      view(0, 0, 6);
      controls.enabled = false;
    } else {
      frustum(4.8);
      view(6.2, 2.6, 5.4);
      controls.enabled = true;
    }
  });

  ui.toggle('Film', true, (on) => { film.visible = on; });
});
