// The frog, fetched once and shared by every scene that wants it.
//
// A real dataset, next to the procedural flower: an iodine-stained micro-CT of
// an Argentine horned frog, Ceratophrys ornata. Kleinteich & Gorb, CC0,
// https://doi.org/10.5061/dryad.066mr
//
// The HEAD and forelimbs, not the whole animal - Dryad describes the file as
// "a micro-CT scan of the head of a 70mm female". Ceratophrys are mostly head,
// so it reads as a whole frog until you notice it stops at the shoulders. We
// downsample the published stack; we do not crop it.
//
// Stained is the point. A plain animal CT is a skeleton in a fog, and a
// session about transfer functions then has only one thing to point at. The
// iodine brings skin, muscle, gut and eye up with the bone, so the histogram
// has bands in it - air at the bottom, soft tissue in the middle, bone above
// that, the eye lenses at the top - and every slide here is about choosing
// between those bands.
//
// It also behaves like real data rather than like a phantom: noisy, with soft
// tissue that shades into the background instead of stopping at it. Most of
// what the voxels session has to say about thresholds only becomes obvious on
// data like this.
//
// Produced by tools/make-frog-volume.py from the published BMP stack. The
// shape is in the filename; SHAPE below has to match it.

import { THREE } from './runtime.js';

export const SHAPE = [256, 195, 256];

/**
 * Half-extents of the box, x across the animal, y dorsoventral, z nose to
 * tail.
 *
 * Measured, not assumed: the scan is 26.68 um isotropic, so the box is just
 * the voxel count in each direction, scaled so the longest side is 0.5. The
 * scanned block is 51.7 x 39.3 x 51.7 mm, which is why y is the short one -
 * a frog sitting flat is wider and longer than it is tall.
 */
export const BOUNDS = [0.5, 0.3809, 0.5];

/** The same, for scenes that want it by name rather than by position. */
export const EXTENT = { x: BOUNDS[0], y: BOUNDS[1], z: BOUNDS[2] };

/**
 * Where things sit in this scan, as a fraction of the 0-1 value range.
 *
 * Read off the histogram of the volume the tool writes, and shared so that
 * the scenes agree about what a number means. Four scenes pick thresholds out
 * of this dataset and they were drifting apart by eye.
 */
export const BANDS = {
  air: 0.02,        // outside the animal, and it really is flat zero there
  skin: 0.09,       // the first thing a ray meets
  tissue: 0.28,     // muscle, gut, the bulk of the animal
  bone: 0.55,       // skeleton, well clear of the tissue above it
  lens: 0.95,       // the two eye lenses, the brightest thing in the scan
};

/**
 * The display window: the part of the range the specimen actually occupies.
 *
 * Air is zero and the top third of the range holds nothing but two eye
 * lenses, so a color ramp spread evenly over 0 to 1 spends most of itself on
 * values that are not in the volume and renders the frog as a dark smudge.
 * Every scene that shows this scan in greys passes this to `window`.
 */
export const WINDOW = [0.0, 0.62];

/**
 * The color ramp for the two scenes that draw this scan as blocks, and the
 * range to spread it over.
 *
 * SPREAD is not WINDOW. WINDOW is the part of the range the specimen occupies
 * at all; this is the part occupied by the voxels that survive a threshold,
 * which run from about 0.12 to 0.45 with the median down at 0.22. Spread a
 * ramp over anything wider and four fifths of the specimen lands in its
 * darkest fifth, and the block comes out a single dark lump.
 *
 * Shared rather than copied into each scene because the voxel grid and the
 * ray caster are meant to be showing the same picture of the same lattice,
 * and two copies of five hex codes drift.
 */
export const RAMP = ['#440154', '#414487', '#2a788e', '#22a884', '#7ad151'];
export const SPREAD = [0.11, 0.42];

/** Where `RAMP` puts a value. */
export function shade(v) {
  return Math.min(1, Math.max(0, (v - SPREAD[0]) / (SPREAD[1] - SPREAD[0])));
}

// Not named URL: that shadows the global URL constructor this line needs,
// and the temporal dead zone turns it into a ReferenceError at import time.
const DATA = new URL('../../data/frog-256x195x256.raw', import.meta.url);

let pending = null;

/**
 * The volume as a Data3DTexture, fetched at most once per page.
 *
 * Every scene awaits the same promise, so four pictures of the same frog cost
 * one request and one upload.
 */
export function loadScan() {
  pending ??= fetch(DATA)
    .then((r) => {
      if (!r.ok) throw new Error(`${DATA}: ${r.status}`);
      return r.arrayBuffer();
    })
    .then((buffer) => {
      const [nx, ny, nz] = SHAPE;
      const data = new Uint8Array(buffer);
      if (data.length !== nx * ny * nz) {
        throw new Error(`frog volume is ${data.length} bytes, expected `
          + `${nx * ny * nz} - SHAPE and the file disagree`);
      }
      const texture = new THREE.Data3DTexture(data, nx, ny, nz);
      texture.format = THREE.RedFormat;
      texture.type = THREE.UnsignedByteType;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.unpackAlignment = 1;
      texture.needsUpdate = true;
      return texture;
    });
  return pending;
}

/**
 * Read the volume at a point in world space, the way the shader does.
 *
 * Trilinear between the eight surrounding voxels, on the same half-voxel
 * offset a texture uses - so a curve plotted beside a rendering and the
 * rendering itself are readings of one dataset and not two approximations of
 * it. Outside the box it returns 0, which is what the scan says is there.
 *
 * Lives here rather than in a scene because three of them need it: the ray
 * tracer plots what one ray meets, the four-mode panel plots the same thing,
 * and the voxel grid resamples the whole volume onto a coarser lattice.
 */
export function makeSampler(data) {
  const [nx, ny, nz] = SHAPE;
  const [bx, by, bz] = BOUNDS;
  const at = (i, j, k) => data[(k * ny + j) * nx + i] / 255;
  const clamp = (v, hi) => (v < 0 ? 0 : (v > hi ? hi : v));

  return (x, y, z) => {
    if (Math.abs(x) > bx || Math.abs(y) > by || Math.abs(z) > bz) return 0;
    const fx = (x / (2 * bx) + 0.5) * nx - 0.5;
    const fy = (y / (2 * by) + 0.5) * ny - 0.5;
    const fz = (z / (2 * bz) + 0.5) * nz - 0.5;
    const i0 = Math.floor(fx);
    const j0 = Math.floor(fy);
    const k0 = Math.floor(fz);
    const tx = fx - i0;
    const ty = fy - j0;
    const tz = fz - k0;
    const ia = clamp(i0, nx - 1);
    const ja = clamp(j0, ny - 1);
    const ka = clamp(k0, nz - 1);
    const i1 = clamp(i0 + 1, nx - 1);
    const j1 = clamp(j0 + 1, ny - 1);
    const k1 = clamp(k0 + 1, nz - 1);

    const c00 = at(ia, ja, ka) * (1 - tx) + at(i1, ja, ka) * tx;
    const c10 = at(ia, j1, ka) * (1 - tx) + at(i1, j1, ka) * tx;
    const c01 = at(ia, ja, k1) * (1 - tx) + at(i1, ja, k1) * tx;
    const c11 = at(ia, j1, k1) * (1 - tx) + at(i1, j1, k1) * tx;
    const c0 = c00 * (1 - ty) + c10 * ty;
    const c1 = c01 * (1 - ty) + c11 * ty;
    return c0 * (1 - tz) + c1 * tz;
  };
}
