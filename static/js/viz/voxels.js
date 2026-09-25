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
export const BUCKETS = [0.04, 0.10, 0.22, 0.38, 0.58, 0.80, 1.0];

/** Below this a voxel is not worth drawing at all. */
export const MIN_ALPHA = 0.03;

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
      // asking for vertex colors on a BoxGeometry that has none makes the
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
 * The positions the volume holds a value at but has nothing to show for.
 *
 * A volume is a value at EVERY position in the block, and a threshold throws
 * most of them away. Draw only what survives and the slide says "a volume is
 * a data structure with holes in it", which is the one thing it is trying not
 * to say - the specimen floats in a wireframe box with nothing between it and
 * the walls, and the empty positions look like absent positions rather than
 * like positions holding zero.
 *
 * So they are drawn, as one point each. Points and not cubes: at 68 across
 * there are a quarter of a million of them, which is nothing as vertices and
 * three million triangles as boxes - and a box big enough to see would hide
 * the specimen behind a fog anyway. Small and faint, they read as the lattice
 * carrying on into the dark, which is what they are.
 *
 * `positions` is flat x, y, z.
 */
export function emptyLattice(positions, {
  color = '#8f9bb0', opacity = 0.085, size = 1.35,
} = {}) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position',
    new THREE.BufferAttribute(new Float32Array(positions), 3));
  return new THREE.Points(geometry, new THREE.PointsMaterial({
    color,
    size,
    // Screen-sized, not world-sized. These have to stay a speckle at every
    // zoom; grown with the lattice they turn into the fog this is avoiding.
    sizeAttenuation: false,
    transparent: true,
    opacity,
    // Occluded by the specimen, but never occluding each other - a quarter
    // of a million transparent points cannot be sorted and do not need to
    // be.
    depthWrite: false,
  }));
}

/**
 * The wireframe box of the acquisition itself.
 *
 * `scale` shrinks it per axis, for the case where the viewer is ignoring the
 * spacing metadata: the block on screen is then the wrong shape, and the box
 * has to be wrong with it or the two disagree.
 */
export function acquisitionBox(bounds, scale = { x: 1, y: 1, z: 1 }) {
  const box = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(
      2 * bounds.x * scale.x, 2 * bounds.y * scale.y, 2 * bounds.z * scale.z,
    )),
    new THREE.LineBasicMaterial({
      color: '#9aa7b4',
      transparent: true,
      opacity: 0.55,
      // Never occludes the specimen, and never writes depth for it to be
      // tested against - see the renderOrder below for the other half.
      depthWrite: false,
    }),
  );
  // Drawn before the volume it encloses.
  //
  // Both are transparent, so they share a queue that three sorts by distance
  // from the camera - and a wireframe box and the volume inside it have the
  // same centre, so the order between them was a coin toss that the box kept
  // winning. A ray marched volume writes no depth, so nothing stopped the
  // box's FAR edges from being painted over the specimen: four white wires
  // apparently running across the front of a frog they are behind.
  //
  // Putting the box first lets the volume paint over whichever edges it
  // covers, which is every edge behind it and the parts of the near edges
  // that cross it. Losing a near edge where it crosses the specimen is the
  // price, and it is much the smaller error: a wire that disappears behind
  // a solid object is what a wire does.
  box.renderOrder = -1;
  return box;
}
