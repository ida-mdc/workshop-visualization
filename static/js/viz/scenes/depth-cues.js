// The same specimen with every depth cue switched on.
//
// Occlusion, shading, a cast shadow, perspective, a ground plane - and a slow
// turn, because motion parallax is on the list beside it and a still picture
// cannot show it. Deliberately a bit over the top: the point is how much
// shape comes back the moment the cues are there, and how little of that is
// in the data rather than in the rendering.
//
// The flat half of the comparison is flat-projection.js, to its left on the
// slide. Both are true pictures of the same object; only one lets you read
// the shape, and only one lets you measure.

import { defineScene, THREE } from '../runtime.js';
import * as shape from '../shape.js';

defineScene('depth-cues', (ctx) => {
  const { scene, view, controls } = ctx;
  view(0.35, 1.5, 4, shape.FIT_RADIUS * 1.25);
  controls.enabled = false;

  const deep = new THREE.Group();
  scene.add(deep);

  const body = new THREE.Mesh(shape.geometry(52),
    new THREE.MeshPhysicalMaterial({
      vertexColors: true, roughness: 0.34, clearcoat: 0.5,
      clearcoatRoughness: 0.3,
    }));
  body.castShadow = true;
  deep.add(body);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(1.6, 56),
    new THREE.MeshStandardMaterial({ color: '#eef1f6', roughness: 0.9 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.0;
  floor.receiveShadow = true;
  scene.add(floor);

  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(2.4, 4.2, 2.2);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  const cam = key.shadow.camera;
  cam.left = -2.2; cam.right = 2.2; cam.top = 2.2; cam.bottom = -2.2;
  cam.near = 0.5; cam.far = 12;
  key.shadow.bias = -0.002;
  scene.add(key, key.target);

  const fill = new THREE.DirectionalLight('#cfe0ff', 0.5);
  fill.position.set(-2.5, 0.4, -1.6);
  scene.add(fill);

  return { tick: () => { deep.rotation.y += 0.004; } };
});
