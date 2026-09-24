// A second specimen: a stellar dendrite snowflake.
//
// Worth having for three reasons beyond variety. It is a plate - wide in x and
// z, very thin in y - which is the shape of a great deal of real imaging data
// and the case where anisotropic sampling hurts most. Its branches span a wide
// range of sizes, so a resolution slider visibly destroys the fine ones first.
// And it is built from boxes rather than ellipsoids, so it keeps flat facets
// and straight edges, which is what makes decimation artefacts obvious.
//
// Same exported surface as shape.js, so a scene can be pointed at either.

import { THREE } from './runtime.js';
import * as solid from './solid.js';

export const BOUNDS = { x: 1.15, y: 0.42, z: 1.15 };
export const FIT_RADIUS = 1.18;

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const TAU = Math.PI * 2;
const ARMS = 6;
const THICK = 0.055;

const ICE = ['#7fb4d8', '#e8f4fb'];
const ICE_CORE = ['#4f8fc0', '#cfe8f7'];

const jitter = solid.rng(0xc0ffee);
const spread = (a) => (jitter() - 0.5) * 2 * a;

/** A flat hexagonal-ish plate: a short cylinder, which reads as a plate. */
function plate(at, radius, thick, seed, tint) {
  return solid.blob('cylinder', V(radius, thick, radius), at, 0.12, seed, tint);
}

/** A crystal arm or branch: a thin box laid from `a` to `b`. */
function branch(a, b, width, thick, seed, tint) {
  return solid.segment('box', a, b, { width, thick }, 0.07, seed, tint, 1.0);
}

const polar = (az, r, h = 0) => V(Math.cos(az) * r, h, Math.sin(az) * r);

const parts = [plate(V(0, 0, 0), 0.165, THICK * 1.25, 5, ICE_CORE)];

for (let i = 0; i < ARMS; i++) {
  const az = (i / ARMS) * TAU;
  const reach = 1.0 + spread(0.04);
  const seed = 11 + i * 17;

  // The main arm, in two tapering runs.
  parts.push(branch(polar(az, 0.08), polar(az, reach * 0.55),
    0.055 + spread(0.006), THICK, seed, ICE));
  parts.push(branch(polar(az, reach * 0.52), polar(az, reach),
    0.040 + spread(0.005), THICK * 0.85, seed + 1, ICE));

  // Side branches at the classic sixty degrees, in mirrored pairs so each arm
  // stays symmetric about itself the way a real crystal is.
  for (const [at, len] of [[0.34, 0.30], [0.58, 0.34], [0.80, 0.22]]) {
    const root = polar(az, reach * at);
    const grow = len * reach * (1 + spread(0.10));
    for (const side of [1, -1]) {
      const tip = new THREE.Vector3()
        .copy(root)
        .add(polar(az + side * (Math.PI / 3), grow));
      parts.push(branch(root, tip, 0.028, THICK * 0.75, seed + 3 + side, ICE));
      // A small plate where a branch ends - dendrites grow these, and they
      // give the silhouette something to lose when the mesh is decimated.
      parts.push(plate(tip, 0.055, THICK * 0.7, seed + 7 + side, ICE));
    }
  }

  parts.push(plate(polar(az, reach), 0.075, THICK * 0.8, seed + 9, ICE));
}

export const PARTS = parts;

export function isInside(x, y, z) {
  return solid.isInsideAny(PARTS, x, y, z);
}

export function geometry(segments = 48, inflate = 0) {
  return solid.buildGeometry(PARTS, segments, inflate);
}

export function surfacePoints(count) {
  return solid.buildSurfacePoints(PARTS, count);
}

/**
 * The value stored at a point, 0 to 1.
 *
 * Denser towards the centre and along each arm's spine, thinning at the
 * branch tips - so a threshold eats the crystal from the outside in, which is
 * exactly what makes the threshold slider worth having.
 */
export function intensityAt(x, y, z) {
  const r = Math.hypot(x, z);
  const core = Math.exp(-(r * r) / 0.06);
  const body = Math.exp(-(r * r) / 1.1);
  const plane = Math.exp(-(y * y) / (THICK * THICK * 2.2));
  return Math.min(1, 0.22 + (0.5 * body + 0.45 * core) * plane);
}

export function sampleVolume(x, y, z) {
  return isInside(x, y, z) ? intensityAt(x, y, z) : solid.backgroundAt(x, y, z);
}
