// A viewer inside the scene.
//
// Level of detail is defined relative to where someone is looking from. If
// that someone is you - the orbit camera - then you cannot inspect the effect,
// because every time you move to get a better look you change the thing you
// were trying to look at.
//
// So the scenes that explain level of detail put a second observer in the
// scene: a small camera glyph with its view frustum drawn, whose position you
// move with a slider. The detail follows the glyph, and you are free to orbit
// around the whole arrangement and watch it from outside.

import { THREE, makeLabel } from './runtime.js';

/**
 * Create the glyph. Returns the group, plus `place(angle, height, distance)`
 * to move it and `position` to read where it is.
 *
 * `aspect` is the frustum's height over its width, for an observer that does
 * not see a roughly square field - a laser scanner aiming one narrow column
 * at a time, say.
 */
export function makeEye({
  color = '#e1462c', reach = 2.6, spread = 0.42, aspect = 0.62,
  // No tag unless one is asked for. These are drawn as sprites from a
  // canvas texture, so on a projector they come out visibly pixelated next
  // to the crisp slide type - and a frustum pointing at the thing it sees
  // does not need the word "camera" under it.
  label = null,
} = {}) {
  const group = new THREE.Group();

  // The frustum, and nothing else: four edges and a rectangle where they end.
  //
  // There used to be a stubby cone at the pinhole as well, which - because a
  // cone is centred on its own height and had to be pulled back so the rays
  // sprang from its tip - widened AWAY from the target. Every glyph was then
  // two objects pointing opposite ways, and in the photogrammetry ring the
  // solid blobs behind the cameras read louder than the frustums in front of
  // them. A wireframe pyramid opening towards what it sees is how
  // photogrammetry software draws a camera, and it only points one way.
  //
  // Everything is built along +z. Object3D.lookAt aims +z at the target for
  // everything except cameras and lights, which aim -z - so a frustum drawn
  // the camera way would point away from the thing it is meant to be looking
  // at.
  const far = reach;
  const s = spread * reach;
  const t = s * aspect;
  const corners = [
    new THREE.Vector3(-s, -t, far), new THREE.Vector3(s, -t, far),
    new THREE.Vector3(s, t, far), new THREE.Vector3(-s, t, far),
  ];
  const pts = [];
  for (const c of corners) {
    pts.push(new THREE.Vector3(0, 0, 0), c.clone());
  }
  for (let i = 0; i < 4; i++) {
    pts.push(corners[i].clone(), corners[(i + 1) % 4].clone());
  }
  group.add(new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({
      // Up from 0.5 now that the solid body is gone and the lines are all
      // there is to see.
      color, transparent: true, opacity: 0.75,
    }),
  ));

  if (label) {
    const tag = makeLabel(label, { color, size: 12, weight: 700, scale: 0.075 });
    tag.position.set(0, 0.24, -0.05);
    tag.center.set(0.5, 0);
    group.add(tag);
  }

  const target = new THREE.Vector3(0, 0, 0);
  const basis = new THREE.Matrix4();

  // Aim in the parent's space, not the world's.
  //
  // Object3D.lookAt takes a world-space point, and these glyphs live inside
  // panel groups that sit well away from the world origin - so aiming them
  // at (0, 0, 0) pointed every camera at a spot off the side of the slide
  // instead of at the specimen in front of it. The target here is local:
  // the centre of whatever the glyph is a child of.
  //
  // Matrix4.lookAt(eye, at, up) puts +z along eye - at, and a non-camera
  // object looks along +z, so the arguments go in this order.
  const aim = () => {
    basis.lookAt(target, group.position, group.up);
    group.quaternion.setFromRotationMatrix(basis);
  };

  return {
    group,
    position: group.position,
    /** Put the glyph on a circle about the target and aim it inwards. */
    place(angle, height, distance) {
      group.position.set(
        Math.cos(angle) * distance, height, Math.sin(angle) * distance,
      );
      aim();
      return group.position;
    },
    /** Where to look, in the parent's coordinates. */
    setTarget(v) {
      target.copy(v);
      aim();
    },
    aim,
  };
}
