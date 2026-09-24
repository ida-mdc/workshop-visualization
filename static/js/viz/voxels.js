// Drawing a sampled volume as cubes, with a believable opacity per voxel.
//
// An InstancedMesh has one material, so alpha cannot vary per instance without
// a custom shader. Quantising into a handful of opacity buckets - one
// InstancedMesh each - is close enough to a continuous ramp to read as one,
// and needs no shader.
//
// Faint voxels are also drawn smaller. Transparency alone is not enough: a
// volume's background fills the entire block, so even at ten percent alpha a
// wall of full-size cubes hides everything inside it. Shrinking with alpha is
// the convention a scatter plot uses for point size, and it turns a fog into
// legible speckle.

import { THREE } from './runtime.js';

/** Opacity levels, faintest to solid. */
export const BUCKETS = [0.10, 0.22, 0.38, 0.58, 0.80, 1.0];

/** Below this a voxel is not worth drawing at all. */
export const MIN_ALPHA = 0.06;

/**
 * A smooth opacity ramp centred on `threshold`.
 *
 * This is the transfer function, and nothing else is. `width` is the softness
 * of its shoulder; zero gives the hard step a binary segmentation shows.
 */
export function opacityRamp(v, threshold, width) {
  if (width <= 0) return v >= threshold ? 1 : 0;
  const t = Math.min(1, Math.max(0, (v - (threshold - width)) / (2 * width)));
  return t * t * (3 - 2 * t);
}

/**
 * Build the instanced meshes for a set of samples.
 *
 * `samples` is flat: x, y, z, value, alpha - five numbers per voxel. `size`
 * is the physical extent of one voxel as {x, y, z}, so a volume sampled
 * coarsely along any one axis is drawn with the boxes it was actually
 * sampled at - which is the whole point of an anisotropy control.
 *
 * Returns a Group; dispose it with clearGroup() from the runtime.
 */
export function bucketedVoxels({ samples, size, colorFor }) {
  const group = new THREE.Group();
  const buckets = BUCKETS.map(() => []);

  for (let n = 0; n < samples.length; n += 5) {
    const a = samples[n + 4];
    if (a < MIN_ALPHA) continue;
    let b = 0;
    while (b < BUCKETS.length - 1 && BUCKETS[b] < a) b++;
    buckets[b].push(samples[n], samples[n + 1], samples[n + 2], samples[n + 3]);
  }

  const m = new THREE.Matrix4();
  buckets.forEach((data, b) => {
    const count = data.length / 4;
    if (!count) return;
    const alpha = BUCKETS[b];
    const solid = alpha > 0.97;
    const f = 0.45 + 0.55 * alpha;
    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(size.x * f, size.y * f, size.z * f),
      // No vertexColors: three.js wires instanceColor up on its own, and
      // asking for vertex colours on a BoxGeometry that has none makes the
      // shader multiply by (0,0,0) - every voxel black.
      new THREE.MeshStandardMaterial({
        roughness: 0.55,
        transparent: !solid,
        opacity: alpha,
        // Semi-transparent instances cannot be depth-sorted against each
        // other, so they must not write depth or they punch holes in what is
        // behind them. The opaque bucket still does.
        depthWrite: solid,
      }),
      count,
    );
    mesh.renderOrder = b;
    for (let n = 0; n < count; n++) {
      m.makeTranslation(data[n * 4], data[n * 4 + 1], data[n * 4 + 2]);
      mesh.setMatrixAt(n, m);
      mesh.setColorAt(n, colorFor(data[n * 4 + 3]));
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
    group.add(mesh);
  });

  return group;
}

/**
 * The wireframe box of the acquisition itself.
 *
 * `scale` shrinks it per axis, for the case where the viewer is ignoring the
 * spacing metadata: the block on screen is then the wrong shape, and the box
 * has to be wrong with it or the two disagree.
 */
export function acquisitionBox(bounds, scale = { x: 1, y: 1, z: 1 }) {
  return new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(
      2 * bounds.x * scale.x, 2 * bounds.y * scale.y, 2 * bounds.z * scale.z,
    )),
    new THREE.LineBasicMaterial({
      color: '#9aa7b4', transparent: true, opacity: 0.55,
    }),
  );
}
