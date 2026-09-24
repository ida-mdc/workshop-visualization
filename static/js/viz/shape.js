// One specimen, shared by every scene on the page: a flower.
//
// The data-types part of the deck argues that voxels, points, meshes and
// vector fields are four ways of sampling the same thing, so all four have to
// be samplings of *literally* the same thing. That means one definition of the
// specimen, and four derivations from it: an inside test for the voxel grid, a
// triangle mesh for the mesh scene, surface samples for the point cloud, and a
// transport field that runs through its own geometry for the vector field.
//
// The specimen is a union of blobs laid along spines rather than an implicit
// surface, which is what makes all of those cheap and exact:
//
//   inside   -> is the point inside any part
//   mesh     -> merge every part's geometry; opaque overlaps read as a union
//   points   -> sample each part's surface, drop what lands inside another
//
// Two things keep it from looking like CAD, which is what a bare union of
// ellipsoids looks like. Every part's radius is modulated by a smooth noise
// field in its own local frame, so no surface is an exact quadric; and every
// petal is jittered in angle, reach and size, so the bloom is not a machined
// six-fold rosette. Both feed the inside test as well as the mesh, so the
// voxel grid and the point cloud stay consistent with the surface.
//
// It is also the reason the shape is recognisable at all. An earlier version
// used one star-shaped radius function, which is elegant and produces a blob
// that teaches nothing on sight - a viewer spends their attention working out
// what they are looking at instead of what the slide is about.

import { THREE } from './runtime.js';

/**
 * Half-extents of the box the specimen fits inside.
 *
 * Not a cube. A flower is wide and shallow, and a cube around it would be
 * mostly air - which for the voxel scene means most of the grid is spent on
 * nothing, exactly the way a badly cropped acquisition wastes disk.
 */
export const BOUNDS = { x: 1.25, y: 0.98, z: 1.25 };

/** Radius of a sphere that frames the specimen nicely. */
export const FIT_RADIUS = 1.25;

/**
 * The zoom the four data-type scenes share.
 *
 * Closer than FIT_RADIUS, because those scenes are about what a data type is
 * made of - vertices, voxels, points, arrows - and at a whole-specimen
 * distance every one of them is dust. One constant rather than four numbers
 * so the section reads as one object looked at four ways, and so retuning it
 * is a single edit.
 */
export const DETAIL_RADIUS = FIT_RADIUS * 0.52;

/**
 * And the direction they are seen from - the same one, for the same reason.
 *
 * Radius alone does not make two scenes match. The specimen is wide and flat,
 * so dropping the camera a few degrees spreads it across the frame and reads
 * as a different zoom even when the fit is identical, which is exactly how
 * these four drifted apart. Spread with `view(...shape.DETAIL_VIEW, ...)`.
 */
export const DETAIL_VIEW = [3.2, 2.2, 4.0];

// ------------------------------------------------------------------- noise

/**
 * Smooth, seamless, seedable noise on the unit sphere of directions, roughly
 * in -1..1.
 *
 * Products of sines rather than gradient noise: it is continuous everywhere
 * including at the poles, needs no tables, and at these amplitudes the
 * difference from "proper" noise is invisible. It has to be cheap, because
 * the voxel grid evaluates it a few hundred thousand times per slider tick.
 */
function wobble(x, y, z, s) {
  return 0.55 * Math.sin(3.7 * x + s) * Math.cos(3.1 * y + 1.7 * s)
    + 0.30 * Math.sin(5.3 * z - 0.9 * s) * Math.cos(4.7 * x + 2.3 * s)
    + 0.15 * Math.sin(8.9 * y + 3.1 * s) * Math.sin(7.7 * z + s);
}

/** Deterministic 0..1 generator. */
function rng(seed) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// -------------------------------------------------------------------- parts

/**
 * One piece of the specimen: an ellipsoid or a cylinder, placed by `matrix`,
 * with its radius modulated by `amp` of the noise field above.
 *
 * `inv` is the inverse of the placement, so the inside test is "transform the
 * point back into the part's own frame and compare against the modulated unit
 * shape".
 */
class Part {
  constructor(kind, scale, quaternion, position, amp, seed, tint) {
    this.kind = kind;
    // Two colours blended along the part's own long axis. Petals darken
    // towards where they attach and pale towards the tip, which is what real
    // ones do and what keeps a bloom of one hue from reading as plastic.
    this.tint = tint || ['#e2685f', '#f3a99b'];
    this.scale = scale;
    this.amp = amp;
    this.seed = seed;
    this.matrix = new THREE.Matrix4().compose(position, quaternion, scale);
    this.inv = this.matrix.clone().invert();
    this.area = kind === 'cylinder'
      ? 2 * Math.PI * scale.x * (2 * scale.y)
      : ellipsoidArea(scale.x, scale.y, scale.z);
    // Bounding sphere for the early-out in contains(). The voxel scene runs
    // isInside over a whole grid on every slider tick - a few hundred thousand
    // calls, each against every part - and a squared-distance rejection is a
    // great deal cheaper than a matrix multiply plus three sines.
    this.centre = position.clone();
    const reach = Math.max(scale.x, scale.y, scale.z) * (1 + amp);
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
    const len = v.length();
    if (len === 0) return true;
    return len <= this.localRadius(v.x / len, v.y / len, v.z / len);
  }
}

/** Knud Thomsen's approximation; good to about one percent. */
function ellipsoidArea(a, b, c) {
  const p = 1.6075;
  return 4 * Math.PI * (((a ** p * b ** p) + (a ** p * c ** p) + (b ** p * c ** p)) / 3) ** (1 / p);
}

/**
 * A part spanning from `a` to `b`.
 *
 * For an ellipsoid the long axis is local +x, the thin axis local +y and the
 * blade width local +z - so a petal is a flat blade whose face is turned the
 * way a real one is, rather than a sausage. For a cylinder the axis is local
 * +y, as three.js builds it.
 */
function segment(kind, a, b, half, amp, seed, tint, stretch = 1.12) {
  const along = new THREE.Vector3().subVectors(b, a);
  const length = along.length() * 0.5 * stretch;
  const ex = along.normalize();
  // Sideways: horizontal and perpendicular to the spine, so the blade lies
  // across the flower rather than standing on edge.
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
    ? new THREE.Vector3(half.r, length, half.r)
    : new THREE.Vector3(length, half.thick, half.width);
  const centre = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
  return new Part(kind, scale, q, centre, amp, seed, tint);
}

function blob(scale, position, amp, seed, tint) {
  return new Part('ellipsoid', scale, new THREE.Quaternion(), position, amp, seed, tint);
}

const TAU = Math.PI * 2;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

/** A point at radius `r` and height `h` on the vertical plane at `azimuth`. */
const polar = (azimuth, r, h) => V(Math.cos(azimuth) * r, h, Math.sin(azimuth) * r);

/**
 * A petal as two blobs laid along a three-point spine, so it curves out of
 * the centre and then flattens - which is the difference between something
 * that reads as a petal and something that reads as a spoke.
 */
function petal(azimuth, spine, half, seed, tint) {
  const [p0, p1, p2] = spine;
  return [
    segment('ellipsoid', p0, p1, half.base, 0.17, seed, tint),
    segment('ellipsoid', p1, p2, half.tip, 0.20, seed + 11, tint),
  ];
}

const TINT = {
  petalOuter: ['#b4384f', '#f2a08f'],
  petalInner: ['#9d2f4c', '#e8766c'],
  receptacle: ['#c9853a', '#e8b25e'],
  stem: ['#4f7f56', '#6d9c63'],
  stamen: ['#e8b93c', '#f7dd9a'],
};

/**
 * The tissue classes the specimen is built from.
 *
 * Every part carries one of these arrays as its `tint`, by reference, so a
 * scene can ask which tissue a part belongs to with `part.tint === TISSUE.stem`
 * - which is exactly what a segmentation of this specimen would have labelled.
 * Pass a colour per class to geometry() and you get a label map instead of a
 * photograph.
 */
export const TISSUE = TINT;

const jitter = rng(0x5eed1eaf);
const spread = (amount) => (jitter() - 0.5) * 2 * amount;

/** Outer petals, kept aside so scenes and the flow field can aim at them. */
const OUTER = [];
const OUTER_SPINES = [];
{
  const n = 8;
  for (let i = 0; i < n; i++) {
    const az = (i / n) * TAU + spread(0.10);
    const reach = 1.06 + spread(0.10);
    const rise = 1 + spread(0.16);
    const spine = [
      polar(az, 0.13, 0.06),
      polar(az, reach * 0.55, 0.27 * rise),
      polar(az, reach, 0.20 * rise),
    ];
    OUTER_SPINES.push(spine);
    OUTER.push(...petal(az, spine, {
      base: { width: 0.145 + spread(0.02), thick: 0.070 },
      tip: { width: 0.175 + spread(0.025), thick: 0.052 },
    }, 3 + i * 5, TINT.petalOuter));
  }
}

/** Inner petals: shorter, steeper, offset from the outer ring. */
const INNER = [];
const INNER_SPINES = [];
{
  const n = 7;
  for (let i = 0; i < n; i++) {
    const az = ((i + 0.5) / n) * TAU + spread(0.12);
    const reach = 0.48 + spread(0.06);
    const spine = [
      polar(az, 0.09, 0.10),
      polar(az, reach * 0.60, 0.33),
      polar(az, reach, 0.45 + spread(0.05)),
    ];
    INNER_SPINES.push(spine);
    INNER.push(...petal(az, spine, {
      base: { width: 0.090 + spread(0.012), thick: 0.058 },
      tip: { width: 0.110 + spread(0.015), thick: 0.046 },
    }, 101 + i * 7, TINT.petalInner));
  }
}

/**
 * The specimen: a stem, a receptacle, two rings of petals and a few stamens.
 *
 * The stamens are deliberately small. They are the first thing to disappear
 * when the voxel resolution comes down, which is the whole point of that
 * slide - a feature smaller than the sampling is simply not in the data.
 */
export const PARTS = [
  // a stem with a slight lean, in two segments
  segment('cylinder', V(0.07, -0.86, 0.03), V(0.015, -0.46, 0.0), { r: 0.068 }, 0.10, 61, TINT.stem),
  segment('cylinder', V(0.015, -0.46, 0.0), V(0, -0.10, 0), { r: 0.074 }, 0.10, 67, TINT.stem),
  blob(V(0.26, 0.17, 0.26), V(0, -0.01, 0), 0.13, 71, TINT.receptacle),

  ...OUTER,
  ...INNER,

  // stamens
  blob(V(0.080, 0.075, 0.080), V(0, 0.17, 0), 0.22, 211, TINT.stamen),
  ...Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * TAU + 0.4;
    return blob(V(0.052, 0.050, 0.052),
      V(Math.cos(a) * 0.135, 0.14 + spread(0.02), Math.sin(a) * 0.135),
      0.24, 221 + i * 3, TINT.stamen);
  }),
];

/** Is this point inside the specimen? Exact - not a voxel lookup. */
export function isInside(x, y, z) {
  for (let i = 0; i < PARTS.length; i++) {
    if (PARTS[i].contains(x, y, z)) return true;
  }
  return false;
}

/** A point on an outer petal's spine, `t` of the way from centre to tip. */
export function petalPoint(t = 0.6, index = 0) {
  const spine = OUTER_SPINES[index % OUTER_SPINES.length];
  const [, p1, p2] = spine;
  return t <= 1
    ? new THREE.Vector3().lerpVectors(spine[0], p1, t)
    : new THREE.Vector3().lerpVectors(p1, p2, Math.min(1, t - 1));
}

// -------------------------------------------------------------------- mesh

/**
 * The specimen as one triangle mesh.
 *
 * `segments` is the tessellation of each part, so halving it is the honest
 * version of "lower the mesh resolution": the parts stay where they are and
 * only their approximation gets coarser.
 *
 * `inflate` grows every part by a fixed distance in its own frame, which is
 * how the outline in the render-intent scene is drawn. Scaling the merged
 * geometry as a whole would not do - that moves the parts apart from each
 * other and the petals come away from the centre.
 *
 * `tintFor(part)` overrides the vertex colours, returning the [from, to] pair
 * to blend along that part. Give it the same colour twice and the part comes
 * out flat, which is how a segmentation looks and how the natural tints do
 * not - see TISSUE.
 */
export function geometry(segments = 64, inflate = 0, tintFor = null) {
  const v = new THREE.Vector3();
  const geos = PARTS.map((part) => {
    const g = part.kind === 'cylinder'
      ? new THREE.CylinderGeometry(1, 1, 2, Math.max(7, Math.round(segments / 3)), 2)
      : new THREE.SphereGeometry(1, Math.max(7, segments),
        Math.max(5, Math.round(segments / 2)));

    // Push every vertex out to the same modulated radius the inside test uses,
    // so the surface and the voxelisation agree.
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      if (part.kind === 'cylinder') {
        const rad = Math.hypot(v.x, v.z);
        if (rad > 1e-6) {
          const f = part.localRadius(v.x / rad, v.y, v.z / rad);
          pos.setXYZ(i, v.x * f, v.y, v.z * f);
        }
      } else {
        const len = v.length();
        if (len > 1e-6) {
          const f = part.localRadius(v.x / len, v.y / len, v.z / len);
          pos.setXYZ(i, v.x * f, v.y * f, v.z * f);
        }
      }
    }

    // A vertex colour per part, blended along the part's long axis. Always
    // present; a material opts in with `vertexColors: true`, which is how the
    // same geometry serves both a tinted render and a flat diagram one.
    const tint = tintFor ? tintFor(part) : part.tint;
    const a = new THREE.Color(tint[0]);
    const b = new THREE.Color(tint[1]);
    const c = new THREE.Color();
    const axis = part.kind === 'cylinder' ? 'y' : 'x';
    const rgb = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const t = axis === 'x' ? pos.getX(i) : pos.getY(i);
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

// ------------------------------------------------------------------ points

/**
 * Points spread over the specimen's surface, as a flat array.
 *
 * Each part is sampled on its own surface and anything that lands inside a
 * different part is dropped, so the result is the surface of the union rather
 * than a pile of overlapping shells.
 *
 * The result is then shuffled with a fixed seed, and that matters more than it
 * looks: a density slider works by drawing the first n of these, so without
 * the shuffle a low density would show whichever parts happen to come first in
 * the list - all stem and no petals.
 */
export function surfacePoints(count) {
  const totalArea = PARTS.reduce((a, p) => a + p.area, 0);
  const golden = Math.PI * (3 - Math.sqrt(5));
  const kept = [];
  const v = new THREE.Vector3();

  PARTS.forEach((part, index) => {
    // Oversample: a good share of these fall inside a neighbouring part,
    // especially for the petals, which all overlap the receptacle.
    const n = Math.ceil((count * 2.0 * part.area) / totalArea);
    for (let i = 0; i < n; i++) {
      const y = 1 - ((i + 0.5) / n) * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const th = golden * i;
      if (part.kind === 'cylinder') {
        // Sides only; the caps are buried in the receptacle and the cut edge.
        const f = part.localRadius(Math.cos(th), y, Math.sin(th));
        v.set(Math.cos(th) * f, y, Math.sin(th) * f);
      } else {
        const ux = Math.cos(th) * r;
        const uz = Math.sin(th) * r;
        const f = part.localRadius(ux, y, uz);
        v.set(ux * f, y * f, uz * f);
      }
      v.applyMatrix4(part.matrix);
      let swallowed = false;
      for (let j = 0; j < PARTS.length && !swallowed; j++) {
        if (j !== index) swallowed = PARTS[j].contains(v.x, v.y, v.z);
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

// --------------------------------------------------------------- the values

/**
 * The value stored at a point, 0 to 1.
 *
 * A voxel holds a measurement, not a yes or no, and that is the whole reason a
 * volume can be cut open and still say something. Here: a dense receptacle and
 * a vascular strand running up the stem into it, so opening the grid reveals
 * structure rather than a uniformly filled solid.
 */
export function intensityAt(x, y, z) {
  const core = Math.exp(-((x * x + (y + 0.01) ** 2 + z * z) / 0.075));
  const strand = Math.exp(-((x * x + z * z) / 0.008));
  return Math.min(1, 0.30 + 0.58 * core + 0.32 * strand);
}

/**
 * What the detector records in empty space: noise, not zero.
 *
 * A hash rather than smooth noise, because sensor noise is uncorrelated
 * between neighbouring samples - that is what makes it read as noise and not
 * as faint structure. Squared, so most samples are very dim and a few are
 * bright, which is how shot noise actually looks.
 */
export function backgroundAt(x, y, z) {
  const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  const u = h - Math.floor(h);
  return 0.03 + 0.17 * u * u;
}

/**
 * What a scan of this specimen actually contains at a point.
 *
 * The important part is that this is defined everywhere in the box, not only
 * on the specimen. A volume is a filled block: every voxel holds a number,
 * and the background ones hold noise. Which of them count as "the specimen"
 * is a threshold somebody chose, not something the data states - which is
 * what the threshold slider in the voxel scene is there to show.
 */
export function sampleVolume(x, y, z) {
  return isInside(x, y, z) ? intensityAt(x, y, z) : backgroundAt(x, y, z);
}


// ---------------------------------------------------------- the flow field

/**
 * Transport through the specimen: sap rising up the stem, through the
 * receptacle and out along every petal.
 *
 * Built from the specimen's own spines rather than from an unrelated analytic
 * vortex, because the slide it illustrates claims that all four
 * representations are the same specimen - and a field that ignores the
 * geometry it is drawn inside makes that claim false on sight.
 *
 * Each channel is a straight run with a direction and a Gaussian falloff away
 * from its axis and past its ends. Summing them gives something smooth that
 * follows the plant: fast and narrow in the stem, spreading and slowing as it
 * fans into the petals, almost still in the air around it.
 */
const CHANNELS = [
  { a: V(0.07, -0.86, 0.03), b: V(0, -0.16, 0), sigma: 0.17, speed: 1.30 },
  // Each petal's run starts where that petal actually attaches, out on the
  // rim of the receptacle rather than on the axis. On the axis every petal
  // would pull equally hard in its own direction, the radial parts would
  // cancel exactly, and transport would rise straight up through the middle
  // of the bloom instead of branching into it.
  ...OUTER_SPINES.map((sp, i) => ({
    a: attach(sp, 0.20, -0.04), b: sp[2].clone(), sigma: 0.20, speed: 0.95,
  })),
  ...INNER_SPINES.map((sp) => ({
    a: attach(sp, 0.14, 0.02), b: sp[2].clone(), sigma: 0.16, speed: 0.70,
  })),
].map((c) => {
  const along = new THREE.Vector3().subVectors(c.b, c.a);
  return {
    ...c,
    dir: along.clone().normalize(),
    length: along.length(),
    inv2Sigma: 1 / (c.sigma * c.sigma),
  };
});

/** A point `r` out along a spine's own azimuth, at height `h`. */
function attach(spine, r, h) {
  const tip = spine[2];
  const az = Math.atan2(tip.z, tip.x);
  return V(Math.cos(az) * r, h, Math.sin(az) * r);
}

const _q = new THREE.Vector3();

export function flowAt(x, y, z, out = new THREE.Vector3()) {
  // A trace of ambient drift keeps the field continuous and non-zero
  // everywhere, but well under FLOW_FLOOR, so the air around the specimen is
  // masked out rather than drawn as a forest of meaningless arrows.
  out.set(0, 0.03, 0);

  for (let i = 0; i < CHANNELS.length; i++) {
    const c = CHANNELS[i];
    _q.set(x - c.a.x, y - c.a.y, z - c.a.z);
    const s = _q.dot(c.dir);
    if (s < -0.25 || s > c.length + 0.3) continue;
    const perp2 = Math.max(0, _q.lengthSq() - s * s);
    if (perp2 * c.inv2Sigma > 6) continue;         // far outside the channel
    const along = (s - c.length * 0.5) / (c.length * 0.8);
    const w = Math.exp(-perp2 * c.inv2Sigma) * Math.exp(-along * along);
    out.addScaledVector(c.dir, w * c.speed);
  }

  // Spreading through the receptacle: the node where one stem's worth of flow
  // divides between the petals. Radial, strongest just above the centre, and
  // zero exactly on the axis - which is true, and is why the streamline scene
  // releases its seeds on a ring rather than on the axis itself.
  const r = Math.hypot(x, z);
  if (r > 1e-4) {
    const rise = (y - 0.02) / 0.15;
    const w = 1.05 * Math.exp(-rise * rise) * Math.exp(-((r / 0.55) ** 2))
      * Math.min(1, r / 0.07);
    out.x += (x / r) * w;
    out.z += (z / r) * w;
  }
  return out;
}

/** Rough upper bound on |flowAt|, for normalising glyph length and colour. */
export const MAX_SPEED = 1.45;

/**
 * Below this speed there is no transport worth drawing.
 *
 * Masking a field to the region it was measured in is what every viewer does
 * and what every honest figure of one shows; drawing the near-zero background
 * as full-length glyphs would claim flow where there is none.
 */
export const FLOW_FLOOR = 0.09;

/**
 * Where to release streamlines so they trace the transport end to end.
 *
 * A ring, not a disc: the axis of an axisymmetric field is a stagnation line,
 * and a seed sitting exactly on it never picks a petal. Seeding off it is
 * what anyone does in ParaView too, for the same reason.
 */
export const FLOW_SOURCE = { centre: V(0.065, -0.84, 0.028), radius: 0.055 };
