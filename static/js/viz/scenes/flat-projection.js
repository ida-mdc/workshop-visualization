// A slice, or a projection: the safe way to look at a volume.
//
// Nothing here is hidden and nothing is inferred, and for a lot of work that
// is the right answer. But every depth cue has been thrown away, so the only
// thing this picture can tell you is what is at each (x, y).
//
// The other half of the comparison is depth-cues.js, one scene to its right
// on the slide. Two scenes rather than two panels of one, because what sits
// between them - the list of what depth buys you - is HTML: text in a scene
// is sized in world units and ends up either unreadable or enormous.

import { defineScene, THREE } from '../runtime.js';
import * as shape from '../shape.js';

/** Pixels across the projection. Coarse enough to compute in one frame. */
const N = 132;

defineScene('flat-projection', (ctx) => {
  const { scene, projection, frustum, view, controls } = ctx;
  const camera = projection('orthographic');
  frustum(2.4);
  view(0, 0, 4);
  controls.enabled = false;

  const canvas = document.createElement('canvas');
  canvas.width = N;
  canvas.height = N;
  const g = canvas.getContext('2d');
  const img = g.createImageData(N, N);
  const B = shape.BOUNDS;
  for (let py = 0; py < N; py++) {
    const y = B.y - ((py + 0.5) / N) * 2 * B.y;
    for (let px = 0; px < N; px++) {
      const x = -B.x + ((px + 0.5) / N) * 2 * B.x;
      // Brightest sample along the view direction, which is what a maximum
      // intensity projection is.
      let peak = 0;
      for (let k = 0; k < 48; k++) {
        const z = -B.z + ((k + 0.5) / 48) * 2 * B.z;
        if (shape.isInside(x, y, z)) {
          peak = Math.max(peak, shape.intensityAt(x, y, z));
        }
      }
      const v = Math.round(255 * (1 - 0.88 * peak));
      const o = (py * N + px) * 4;
      img.data[o] = v;
      img.data[o + 1] = v;
      img.data[o + 2] = v;
      img.data[o + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(2.1, 2.1),
    new THREE.MeshBasicMaterial({ map: texture }),
  );
  plate.quaternion.copy(camera.quaternion);
  plate.add(new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.PlaneGeometry(2.1, 2.1)),
    new THREE.LineBasicMaterial({ color: '#c8ccd4' }),
  ));
  scene.add(plate);
});
