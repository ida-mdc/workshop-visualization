// Perspective or orthographic - the choice that decides whether sizes in your
// figure can be compared.
//
// Three identical specimens, evenly spaced away from the camera. In
// perspective the far one is visibly smaller and the grid lines converge,
// which looks natural and is exactly why it is the wrong projection for a
// figure someone is meant to measure off. In orthographic all three are the
// same size on screen, because they are the same size, and parallel lines
// stay parallel.

import { defineScene, THREE, palette } from '../runtime.js';
import * as shape from '../shape.js';

// The row runs across the frame and away from the camera at the same time.
// A slide is a wide, short box: a row receding straight into it collapses to
// one object, and a row lying flat across it has no depth difference to show.
const SPACING = { x: 2.0, z: 1.4 };

defineScene('projection-choice', ({ scene, ui, view, projection, frustum }) => {
  const geo = shape.geometry(32);
  const material = new THREE.MeshPhysicalMaterial({
    vertexColors: true, roughness: 0.42, clearcoat: 0.3, clearcoatRoughness: 0.5,
  });

  for (let i = -1; i <= 1; i++) {
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(i * SPACING.x, 0, i * SPACING.z);
    scene.add(mesh);
  }

  // The floor earns its place: convergence of parallel lines is the cue people
  // actually read perspective from, more than the size difference.
  const grid = new THREE.GridHelper(9, 9, 0xb8b8c2, 0xdcdce2);
  grid.position.y = -1.0;
  scene.add(grid);

  ui.choice('Projection', ['Perspective', 'Orthographic'], (i) => {
    projection(i === 0 ? 'perspective' : 'orthographic');
    frustum(3.6);
    view(0.15, 1.0, 6.5, 1.8);
  });
});
