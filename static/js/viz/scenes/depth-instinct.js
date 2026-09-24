// The opening slide, and it argues without saying anything.
//
// A cloud of identical dots. Held still it is noise - you cannot tell what it
// is, and no amount of looking helps. Then it turns, and within about half a
// second everyone in the room is looking at a flower. Nobody was told to
// reconstruct a surface from a moving set of points; they just did, and they
// did it faster than any of the software in this workshop could.
//
// That is the whole case for putting data in three dimensions: the audience
// arrives with a very good 3D reconstruction engine already running, and a
// flat picture leaves it idle.
//
// Everything that could give the game away early is deliberately removed:
//
//   orthographic        no perspective, so near and far are not a size cue
//   sizeAttenuation off so a near dot is not bigger than a far one
//   one flat colour     no shading, no depth-cued brightness
//   no ground, no box   nothing to read a position against
//
// What is left is structure from motion, and nothing else.

import { defineScene, THREE, palette } from '../runtime.js';
import * as shape from '../shape.js';

// Sparse on purpose. Dense enough and the cloud paints a solid silhouette,
// which is recognisable while it is still and there is nothing left to
// reveal. At this count you see dots from the front and the back of the
// surface at once, cannot tell which is which, and motion is what separates
// them - which is the whole demonstration.
const COUNT = 1100;

/** Seconds the cloud is held still before it starts to turn. */
const HOLD = 2.2;

/** Seconds the rotation takes to reach full speed. */
const EASE = 1.6;

const SPEED = 0.42;           // radians per second, once up to speed

defineScene('depth-instinct', (ctx) => {
  const { scene, projection, frustum, view, controls } = ctx;

  // Orthographic on purpose: under perspective the near side of the cloud is
  // magnified, and that alone gives the shape away while it is still.
  projection('orthographic');
  frustum(2.45);
  view(0.35, 0.22, 4);
  controls.enabled = false;

  const cloud = new THREE.Group();
  scene.add(cloud);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(shape.surfacePoints(COUNT), 3),
  );
  cloud.add(new THREE.Points(geometry, new THREE.PointsMaterial({
    color: palette.dark,
    size: 3.4,
    // In pixels, not world units - so a dot at the back is exactly as big as
    // a dot at the front and size cannot stand in for depth.
    sizeAttenuation: false,
  })));

  let elapsed = 0;
  let previous = null;

  return {
    tick: (now) => {
      // The runtime only ticks while the illustration is on screen, so the
      // hold is measured in time the room has actually been looking at it.
      if (previous === null) previous = now;
      const dt = Math.min(0.1, now - previous);
      previous = now;
      elapsed += dt;

      const ramp = Math.min(1, Math.max(0, (elapsed - HOLD) / EASE));
      // Smoothstep, so it does not lurch into motion.
      cloud.rotation.y += SPEED * ramp * ramp * (3 - 2 * ramp) * dt;
    },
  };
});
