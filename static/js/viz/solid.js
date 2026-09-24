// Building specimens out of primitives.
//
// Every specimen in these slides is a union of ellipsoids, cylinders and
// boxes, each with its radius modulated by a smooth noise field in its own
// local frame. That combination is what lets one definition serve all four
// representations the deck talks about, exactly and cheaply:
//
//   inside   -> is the point inside any part
//   mesh     -> merge every part's geometry; opaque overlaps read as a union
//   points   -> sample each part's surface, drop what lands inside another
//   volume   -> sample a value at any point, inside or out
//
// The noise matters more than it sounds. A bare union of quadrics looks like
// CAD, and a viewer spends their attention deciding what they are looking at
// instead of what the slide is about. The noise feeds the inside test as well
// as the mesh, so the voxelisation and the point cloud stay consistent with
// the surface rather than drifting away from it.
//
// Specimens live in their own modules - shape.js is the flower, snowflake.js
// the snowflake - and each exports the same handful of functions so a scene
// can be pointed at either.

import { THREE } from './runtime.js';

/**
 * Smooth, seedable noise over directions, roughly in -1..1.
 *
 * Products of sines rather than gradient noise: continuous everywhere
 * including at the poles, no tables, and at these amplitudes the difference
 * from "proper" noise is invisible. It has to be cheap, because a voxel grid
 * evaluates it a few hundred thousand times per slider tick.
 */
export function wobble(x, y, z, s) {
  return 0.55 * Math.sin(3.7 * x + s) * Math.cos(3.1 * y + 1.7 * s)
    + 0.30 * Math.sin(5.3 * z - 0.9 * s) * Math.cos(4.7 * x + 2.3 * s)
    + 0.15 * Math.sin(8.9 * y + 3.1 * s) * Math.sin(7.7 * z + s);
}

/** Deterministic 0..1 generator, so a specimen is the same every reload. */
export function rng(seed) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Knud Thomsen's approximation; good to about one percent. */
function ellipsoidArea(a, b, c) {
  const p = 1.6075;
  return 4 * Math.PI
    * (((a ** p * b ** p) + (a ** p * c ** p) + (b ** p * c ** p)) / 3) ** (1 / p);
}

/**
 * One piece of a specimen, placed by `matrix`, with its radius modulated by
 * `amp` of the noise above. `inv` is the inverse placement, so the inside test
 * is "transform the point back into the part's own frame and compare against
 * the modulated unit shape".
 */
export class Part {
  constructor(kind, scale, quaternion, position, amp, seed, tint) {
    this.kind = kind;
    this.scale = scale;
    this.amp = amp;
    this.seed = seed;
    this.tint = tint || ['#d8d8e2', '#f2f2f6'];
    this.matrix = new THREE.Matrix4().compose(position, quaternion, scale);
    this.inv = this.matrix.clone().invert();
    this.area = kind === 'cylinder'
      ? 2 * Math.PI * scale.x * (2 * scale.y)
      : kind === 'box'
        ? 8 * (scale.x * scale.y + scale.x * scale.z + scale.y * scale.z)
        : ellipsoidArea(scale.x, scale.y, scale.z);
    // Bounding sphere for the early-out in contains(). A voxel grid runs the
    // inside test over its whole grid on every slider tick - hundreds of
    // thousands of calls, each against every part - and a squared-distance
    // rejection is far cheaper than a matrix multiply plus three sines.
    this.centre = position.clone();
    const reach = Math.hypot(scale.x, scale.y, scale.z) * (1 + amp);
    this.boundSq = reach * reach;
    this._v = new THREE.Vector3();
  }

  /** How far the surface sits along a unit direction in the part's frame. */
  localRadius(ux, uy, uz) {
    return 1 + this.amp * wobble(ux, uy, uz, this.seed);
  }

  contains(x, y, z) {
    const dx = x - this.centre.x;
    const dy = y - this.centre.y;
    const dz = z - this.centre.z;
    if (dx * dx + dy * dy + dz * dz > this.boundSq) return false;

    const v = this._v.set(x, y, z).applyMatrix4(this.inv);
    if (this.kind === 'cylinder') {
      if (Math.abs(v.y) > 1) return false;
      const rad = Math.hypot(v.x, v.z);
      if (rad === 0) return true;
      return rad <= this.localRadius(v.x / rad, v.y, v.z / rad);
    }
    if (this.kind === 'box') {
      // Noise on a box perturbs its faces rather than a radius, so a crystal
      // keeps its flat facets and straight edges instead of turning into a
      // rounded lump - which is the whole visual point of a box part.
      const f = 1 + this.amp * wobble(v.x, v.y, v.z, this.seed);
      return Math.abs(v.x) <= f && Math.abs(v.y) <= f && Math.abs(v.z) <= f;
    }
    const len = v.length();
    if (len === 0) return true;
    return len <= this.localRadius(v.x / len, v.y / len, v.z / len);
  }
}

const V = (x, y, z) => new THREE.Vector3(x, y, z);

/** An axis-aligned part at `position`. */
export function blob(kind, scale, position, amp, seed, tint) {
  return new Part(kind, scale, new THREE.Quaternion(), position, amp, seed, tint);
}

/**
 * A part spanning from `a` to `b`.
 *
 * For an ellipsoid or box the long axis is local +x, the thin axis local +y and
 * the width local +z - so a petal or a crystal arm is a flat blade whose face
 * is turned the way a real one is, rather than a sausage. For a cylinder the
 * axis is local +y, as three.js builds it.
 */
export function segment(kind, a, b, half, amp, seed, tint, stretch = 1.12) {
  const along = new THREE.Vector3().subVectors(b, a);
  const length = along.length() * 0.5 * stretch;
  const ex = along.normalize();
  const ez = new THREE.Vector3(-ex.z, 0, ex.x);
  if (ez.lengthSq() < 1e-6) ez.set(0, 0, 1);
  ez.normalize();
  const ey = new THREE.Vector3().crossVectors(ez, ex).normalize();
  ez.crossVectors(ex, ey).normalize();

  const basis = kind === 'cylinder'
    ? new THREE.Matrix4().makeBasis(ez, ex, ey)   // cylinder axis is local +y
    : new THREE.Matrix4().makeBasis(ex, ey, ez);
  const q = new THREE.Quaternion().setFromRotationMatrix(basis);
  const scale = kind === 'cylinder'
    ? V(half.r, length, half.r)
    : V(length, half.thick, half.width);
  const centre = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
  return new Part(kind, scale, q, centre, amp, seed, tint);
}

/** Is this point inside any of `parts`? */
export function isInsideAny(parts, x, y, z) {
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].contains(x, y, z)) return true;
  }
  return false;
}

function unitGeometry(part, segments) {
  if (part.kind === 'cylinder') {
    return new THREE.CylinderGeometry(1, 1, 2,
      Math.max(7, Math.round(segments / 3)), 2);
  }
  if (part.kind === 'box') {
    return new THREE.BoxGeometry(2, 2, 2, 2, 2, 2);
  }
  return new THREE.SphereGeometry(1, Math.max(7, segments),
    Math.max(5, Math.round(segments / 2)));
}

/**
 * The union of `parts` as one triangle mesh, with a per-vertex colour blended
 * along each part's long axis.
 *
 * `segments` tessellates each part, so halving it is the honest version of
 * "lower the mesh resolution": the parts stay where they are and only their
 * approximation gets coarser.
 *
 * `inflate` grows every part by a fixed distance in its own frame, which is how
 * an outline is drawn. Scaling the merged geometry as a whole would not do -
 * that moves the parts apart from each other.
 */
export function buildGeometry(parts, segments = 64, inflate = 0) {
  const v = new THREE.Vector3();
  const geos = parts.map((part) => {
    const g = unitGeometry(part, segments);
    const pos = g.attributes.position;

    // Push every vertex out to the same modulated surface the inside test
    // uses, so the mesh and the voxelisation agree.
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      if (part.kind === 'cylinder') {
        const rad = Math.hypot(v.x, v.z);
        if (rad > 1e-6) {
          const f = part.localRadius(v.x / rad, v.y, v.z / rad);
          pos.setXYZ(i, v.x * f, v.y, v.z * f);
        }
      } else if (part.kind === 'box') {
        const f = 1 + part.amp * wobble(v.x, v.y, v.z, part.seed);
        pos.setXYZ(i, v.x * f, v.y * f, v.z * f);
      } else {
        const len = v.length();
        if (len > 1e-6) {
          const f = part.localRadius(v.x / len, v.y / len, v.z / len);
          pos.setXYZ(i, v.x * f, v.y * f, v.z * f);
        }
      }
    }

    const a = new THREE.Color(part.tint[0]);
    const b = new THREE.Color(part.tint[1]);
    const c = new THREE.Color();
    const alongY = part.kind === 'cylinder';
    const rgb = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const t = alongY ? pos.getY(i) : pos.getX(i);
      c.copy(a).lerp(b, Math.min(1, Math.max(0, (t + 1) / 2)));
      rgb[i * 3] = c.r; rgb[i * 3 + 1] = c.g; rgb[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(rgb, 3));

    if (inflate) {
      const s = part.scale;
      g.scale(1 + inflate / s.x, 1 + inflate / s.y, 1 + inflate / s.z);
    }
    g.applyMatrix4(part.matrix);
    g.computeVertexNormals();
    return g;
  });
  const merged = THREE.mergeGeometries(geos);
  for (const g of geos) g.dispose();
  return merged;
}

/**
 * Points spread over the union's surface, as a flat array.
 *
 * Each part is sampled on its own surface and anything landing inside another
 * part is dropped, so the result is the surface of the union rather than a pile
 * of overlapping shells.
 *
 * The result is shuffled with a fixed seed, and that matters more than it
 * looks: a density slider draws the first n of these, so without the shuffle a
 * low density would show whichever parts come first in the list.
 */
export function buildSurfacePoints(parts, count) {
  const totalArea = parts.reduce((a, p) => a + p.area, 0);
  const golden = Math.PI * (3 - Math.sqrt(5));
  const kept = [];
  const v = new THREE.Vector3();

  parts.forEach((part, index) => {
    // Oversample: a good share of these land inside a neighbouring part.
    const n = Math.ceil((count * 2.0 * part.area) / totalArea);
    for (let i = 0; i < n; i++) {
      const y = 1 - ((i + 0.5) / n) * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const th = golden * i;
      if (part.kind === 'cylinder') {
        const f = part.localRadius(Math.cos(th), y, Math.sin(th));
        v.set(Math.cos(th) * f, y, Math.sin(th) * f);
      } else {
        const ux = Math.cos(th) * r;
        const uz = Math.sin(th) * r;
        if (part.kind === 'box') {
          // Project the direction onto the cube's surface: whichever axis is
          // largest decides the face, the other two slide along it.
          const m = Math.max(Math.abs(ux), Math.abs(y), Math.abs(uz)) || 1;
          v.set(ux / m, y / m, uz / m);
          const f = 1 + part.amp * wobble(v.x, v.y, v.z, part.seed);
          v.multiplyScalar(f);
        } else {
          const f = part.localRadius(ux, y, uz);
          v.set(ux * f, y * f, uz * f);
        }
      }
      v.applyMatrix4(part.matrix);
      let swallowed = false;
      for (let j = 0; j < parts.length && !swallowed; j++) {
        if (j !== index) swallowed = parts[j].contains(v.x, v.y, v.z);
      }
      if (!swallowed) kept.push(v.x, v.y, v.z);
    }
  });

  const n = kept.length / 3;
  const order = new Uint32Array(n);
  for (let i = 0; i < n; i++) order[i] = i;
  const rand = rng(0x9e3779b9);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }

  const out = new Float32Array(n * 3);
  for (let k = 0; k < n; k++) {
    const i = order[k];
    out[k * 3] = kept[i * 3];
    out[k * 3 + 1] = kept[i * 3 + 1];
    out[k * 3 + 2] = kept[i * 3 + 2];
  }
  return out;
}

/**
 * What a detector records in empty space: noise, not zero.
 *
 * A hash rather than smooth noise, because sensor noise is uncorrelated
 * between neighbouring samples - that is what makes it read as noise and not
 * as faint structure. Squared, so most samples are dim and a few are bright,
 * which is how shot noise actually looks.
 */
export function backgroundAt(x, y, z) {
  const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  const u = h - Math.floor(h);
  return 0.03 + 0.17 * u * u;
}
