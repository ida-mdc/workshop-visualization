// How a block of numbers becomes a picture: one ray per pixel.
//
// Ray CASTING, not ray tracing - one primary ray per pixel and nothing
// secondary. Nothing reflects, refracts or casts a shadow.
//
// The slide before this one says a volume is a grid of values, and renders
// it at a resolution coarse enough to see the grid. This one keeps the same
// block of values and puts a camera in front of it - drawn as blocks here,
// because what a ray reads is one number per block and the blocks have to be
// countable for that to mean anything. The rig is seen from outside: the
// camera as a
// point, the image as a grid of pixels hanging in front of it, and the
// lattice behind. One pixel is picked out, its ray is drawn through the
// blocks, and the values it collects are plotted underneath. That plot is
// the curve the next slide draws four times.
//
// One resolution, and no control over it. The lattice, the number of samples
// a ray takes and the number of pixels in the image are all the same number,
// because that is the honest version: a ray that takes one sample per block
// misses nothing and invents nothing, and an image with one pixel per column
// of blocks is what the data can actually support. A slider for any of those
// invites the question "so what is the right value", which is a different
// slide.
//
// The little picture is marched here, on the CPU, through the same lattice
// the blocks are drawn from - nearest sample, no interpolation - so it is a
// rendering OF those blocks and not of something next to them.

import { defineScene, THREE, ramp, panelPlots, makeLabel } from '../runtime.js';
import { acquisitionBox, bucketedVoxels, emptyLattice } from '../voxels.js';
import {
  loadScan, makeSampler, shade, BANDS, BOUNDS, RAMP,
} from '../scan.js';

// The frog is laid on its back, the way every other volume slide here shows
// it, so world space is not scan space:
//
//     world x   across the animal       = scan x
//     world y   nose up                 = -scan z
//     world z   back towards the camera = scan y
//
// STAGE is the quarter turn that does it and WORLD are the half-extents that
// come out. Everything else in this file - the box, the ray, the lattice -
// works in world space, and only buildLattice converts back.
const STAGE = Math.PI / 2;
const WORLD = { x: BOUNDS[0], y: BOUNDS[2], z: BOUNDS[1] };

// One number for the lattice, for the sampling and for the image. 48 across
// is fine enough that the frog is a frog and coarse enough that a pixel is
// visibly a pixel, which is the whole job of this illustration.
const GRID = 48;
const NX = GRID;
const NY = Math.round(GRID * (WORLD.y / WORLD.x));
const NZ = Math.round(GRID * (WORLD.z / WORLD.x));

// The rig, in world units: the camera off the +z side, looking at the frog's
// back, with the image plane hanging between it and the block.
const EYE = new THREE.Vector3(0, 0, 1.8);
const PLANE_AT = 0.75;
const PLANE_HALF = 0.39;      // just holds the block, and square as it is

// In or out, at one level, exactly as the previous slide draws it. A ramp
// with a soft shoulder in it belongs to the transfer function's slide.
const THRESHOLD = BANDS.skin + 0.02;

// What one block contributes to the pixel its ray passes through. Low enough
// that a ray crosses the animal before it fills up, so the pixel is the
// average of what is in there rather than the color of the first block it
// touched.
const DENSITY = 0.16;

const PLOT_HEIGHT = 104;
const INK = '#232430';
const HOT = '#e1462c';
const MUTED = '#8d95a3';
const BACKDROP = [18, 20, 26];   // what a ray that hits nothing shows

/** The twelve edges of a unit cube about the origin, as corner pairs. */
const BOX_EDGES = (() => {
  const c = [];
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
    c.push([x, y, z]);
  }
  const out = [];
  for (let a = 0; a < 8; a++) {
    for (let b = a + 1; b < 8; b++) {
      // Two corners share an edge when they differ in exactly one axis.
      const diff = c[a].reduce((n, v, k) => n + (v !== c[b][k] ? 1 : 0), 0);
      if (diff === 1) out.push([c[a], c[b]]);
    }
  }
  return out;
})();

/** Where a ray enters and leaves the block, or null if it misses it. */
function hitBox(origin, dir) {
  let near = -Infinity;
  let far = Infinity;
  const half = [WORLD.x, WORLD.y, WORLD.z];
  const o = [origin.x, origin.y, origin.z];
  const d = [dir.x, dir.y, dir.z];
  for (let a = 0; a < 3; a++) {
    if (Math.abs(d[a]) < 1e-9) {
      if (Math.abs(o[a]) > half[a]) return null;
      continue;
    }
    const t1 = (-half[a] - o[a]) / d[a];
    const t2 = (half[a] - o[a]) / d[a];
    near = Math.max(near, Math.min(t1, t2));
    far = Math.min(far, Math.max(t1, t2));
  }
  return far > Math.max(near, 0) ? [Math.max(near, 0), far] : null;
}

/**
 * The world position of the centre of pixel (i, j) on the image plane.
 *
 * i counts DOWN in x, because the plane is turned half a turn to face a
 * camera on the +z side and its texture u then points along world -x - so
 * column i of the image is column i of the picture and not its mirror.
 */
function pixelCentre(i, j) {
  const pitch = (2 * PLANE_HALF) / GRID;
  return new THREE.Vector3(
    PLANE_HALF - (i + 0.5) * pitch,
    -PLANE_HALF + (j + 0.5) * pitch,
    PLANE_AT,
  );
}

defineScene('volume-raycasting', (ctx) => {
  const { scene, ui, view } = ctx;
  view(1.75, 0.58, 1.45, 0.86, [0, 0, 0.35]);

  let pixel = 0;                 // one index over the whole image
  let lattice = null;            // NX * NY * NZ, resampled from the scan
  let pixelSlider = null;

  // ------------------------------------------------------------ the scene

  const stage = new THREE.Group();
  stage.rotation.x = STAGE;
  scene.add(stage);
  stage.add(acquisitionBox({ x: BOUNDS[0], y: BOUNDS[1], z: BOUNDS[2] }));

  const eye = new THREE.Mesh(
    new THREE.SphereGeometry(0.04, 20, 14),
    new THREE.MeshStandardMaterial({
      color: INK, roughness: 0.45, metalness: 0.1,
    }),
  );
  eye.position.copy(EYE);
  scene.add(eye);

  // The image, one texel per pixel and no filtering: this is the one picture
  // in the deck where the reader is meant to see the pixels.
  const image = new Uint8Array(GRID * GRID * 4);
  const imageTex = new THREE.DataTexture(image, GRID, GRID);
  imageTex.minFilter = THREE.NearestFilter;
  imageTex.magFilter = THREE.NearestFilter;
  imageTex.colorSpace = THREE.SRGBColorSpace;
  imageTex.needsUpdate = true;

  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(2 * PLANE_HALF, 2 * PLANE_HALF),
    new THREE.MeshBasicMaterial({ map: imageTex, side: THREE.DoubleSide }),
  );
  plane.rotation.y = Math.PI;
  plane.position.z = PLANE_AT;
  scene.add(plane);

  // The pixel grid, drawn over the image rather than baked into it - a texel
  // spent on a grid line is a texel not spent on the picture. Nudged towards
  // the camera so it sits on the image rather than fighting it for depth.
  const gridPoints = [];
  const gridZ = PLANE_AT + 0.003;
  for (let n = 0; n <= GRID; n++) {
    const p = -PLANE_HALF + (n / GRID) * 2 * PLANE_HALF;
    gridPoints.push(
      new THREE.Vector3(p, -PLANE_HALF, gridZ),
      new THREE.Vector3(p, PLANE_HALF, gridZ),
      new THREE.Vector3(-PLANE_HALF, p, gridZ),
      new THREE.Vector3(PLANE_HALF, p, gridZ),
    );
  }
  scene.add(new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(gridPoints),
    new THREE.LineBasicMaterial({
      color: '#ffffff', transparent: true, opacity: 0.16,
    }),
  ));

  // The ray, its samples and the pixel they belong to are all drawn ON TOP,
  // and `depthTest: false` alone is not enough to do that. The plane and the
  // box are transparent, and three draws the whole transparent queue after
  // the opaque one - so an opaque line, however much it ignores the depth
  // buffer, can still be painted over. Marking these transparent puts them
  // in the same queue, where renderOrder decides.
  const OVERLAY = { transparent: true, depthTest: false, depthWrite: false };

  const marker = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(), new THREE.Vector3(),
      new THREE.Vector3(), new THREE.Vector3(),
    ]),
    new THREE.LineBasicMaterial({ color: HOT, ...OVERLAY }),
  );
  marker.renderOrder = 20;
  scene.add(marker);

  // The viewing pyramid, stopped at the near face of the block. Carried the
  // whole way through it keeps diverging, and by the far face the four long
  // diagonals have taken over the drawing.
  const corners = [];
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const corner = new THREE.Vector3(
      sx * PLANE_HALF, sy * PLANE_HALF, PLANE_AT,
    );
    const dir = corner.clone().sub(EYE).normalize();
    const t = (WORLD.z - EYE.z) / dir.z;
    corners.push(EYE.clone(), EYE.clone().addScaledVector(dir, t));
  }
  scene.add(new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(corners),
    new THREE.LineBasicMaterial({
      color: MUTED, transparent: true, opacity: 0.45,
    }),
  ));

  const ray = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(), new THREE.Vector3(),
    ]),
    new THREE.LineBasicMaterial({ color: HOT, ...OVERLAY }),
  );
  ray.renderOrder = 20;
  scene.add(ray);

  // The blocks this ray reads, outlined.
  //
  // The dots say where the ray was sampled; these say which blocks those
  // samples came out of, which is the thing the pixel is actually computed
  // from. Pre-allocated for more cells than an axial ray can ever touch and
  // drawn with a draw range, because rebuilding a buffer per frame while a
  // slider is dragged is the one allocation in this scene that would show.
  const MAX_CELLS = 96;
  const cellEdges = new THREE.BufferGeometry();
  cellEdges.setAttribute('position',
    new THREE.BufferAttribute(new Float32Array(MAX_CELLS * 24 * 3), 3));
  const visited = new THREE.LineSegments(cellEdges,
    new THREE.LineBasicMaterial({ color: HOT, opacity: 0.85, ...OVERLAY }));
  visited.renderOrder = 19;
  scene.add(visited);

  // One instanced sphere per sample, all the same color as the ray. Tinting
  // them by the value they read looked right in the lookup table and
  // vanished in the scene; what they have to say here is "the ray is read
  // once per block, and here are the places", and what the values were is
  // the plot's job underneath.
  const dots = new THREE.InstancedMesh(
    new THREE.SphereGeometry(1, 10, 7),
    new THREE.MeshBasicMaterial({ color: HOT, ...OVERLAY }),
    NZ,
  );
  dots.renderOrder = 21;
  dots.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  dots.count = 0;
  scene.add(dots);

  for (const [text, at] of [
    ['camera', [EYE.x, EYE.y - 0.18, EYE.z]],
    ['image plane', [0, -PLANE_HALF - 0.16, PLANE_AT]],
    ['the volume', [0, WORLD.y + 0.14, 0]],
  ]) {
    const label = makeLabel(text, { color: INK, size: 14, scale: 0.075 });
    label.position.fromArray(at);
    scene.add(label);
  }

  // -------------------------------------------------------------- the data

  /** Centre of lattice cell (i, j, k), in world space. */
  const cellX = (i) => -WORLD.x + (i + 0.5) * ((2 * WORLD.x) / NX);
  const cellY = (j) => -WORLD.y + (j + 0.5) * ((2 * WORLD.y) / NY);
  const cellZ = (k) => -WORLD.z + (k + 0.5) * ((2 * WORLD.z) / NZ);

  /** The lattice value at a world point: nearest cell, 0 outside. */
  function valueAt(x, y, z) {
    const i = Math.floor(((x + WORLD.x) / (2 * WORLD.x)) * NX);
    const j = Math.floor(((y + WORLD.y) / (2 * WORLD.y)) * NY);
    const k = Math.floor(((z + WORLD.z) / (2 * WORLD.z)) * NZ);
    if (i < 0 || j < 0 || k < 0 || i >= NX || j >= NY || k >= NZ) return 0;
    return lattice[(k * NY + j) * NX + i];
  }

  function buildLattice(sample) {
    lattice = new Float32Array(NX * NY * NZ);
    const cubes = [];
    const empty = [];
    for (let k = 0; k < NZ; k++) {
      const z = cellZ(k);
      for (let j = 0; j < NY; j++) {
        const y = cellY(j);
        for (let i = 0; i < NX; i++) {
          const x = cellX(i);
          // World back to scan: the stage turned the specimen a quarter turn
          // about x, so undoing it is (x, y, z) -> (x, z, -y).
          const v = sample(x, z, -y);
          lattice[(k * NY + j) * NX + i] = v;
          // Every position holds a number, and the ones below the threshold
          // hold zero rather than nothing - same as the slide before this.
          if (v >= THRESHOLD) cubes.push(x, y, z, v, 1);
          else empty.push(x, y, z);
        }
      }
    }
    // Built in world coordinates and then turned back, so the blocks ride
    // inside the stage with the box while the ray keeps working in the
    // world coordinates above.
    const blocks = bucketedVoxels({
      samples: cubes,
      size: {
        x: (2 * WORLD.x) / NX,
        y: (2 * WORLD.y) / NY,
        z: (2 * WORLD.z) / NZ,
      },
      colorFor: (v) => ramp(RAMP, shade(v)),
    });
    blocks.rotation.x = -STAGE;
    stage.add(blocks);

    const haze = emptyLattice(empty);
    haze.rotation.x = -STAGE;
    stage.add(haze);
  }

  // ------------------------------------------------------------- the maths

  /**
   * March one ray and return what it collected.
   *
   * One sample per lattice cell along the ray, which is what "the sampling
   * matches the data" means: no step size to choose, nothing skipped and
   * nothing counted twice.
   */
  function march(dir) {
    const span = hitBox(EYE, dir);
    if (!span) return null;
    const [t0, t1] = span;
    const n = NZ;
    const dt = (t1 - t0) / n;

    const profile = new Float32Array(n);
    const p = new THREE.Vector3();
    const color = new THREE.Color();
    let r = 0;
    let g = 0;
    let b = 0;
    let acc = 0;

    for (let s = 0; s < n; s++) {
      p.copy(EYE).addScaledVector(dir, t0 + (s + 0.5) * dt);
      const v = valueAt(p.x, p.y, p.z);
      // The profile is the whole crossing, every time: it is about what is
      // there, not about how far the renderer bothered to look.
      profile[s] = v;
      if (v < THRESHOLD || acc > 0.995) continue;

      color.copy(ramp(RAMP, shade(v)));
      const a = DENSITY * (1 - acc);
      r += color.r * a;
      g += color.g * a;
      b += color.b * a;
      acc += a;
    }

    return { t0, t1, dt, profile, alpha: acc, color: [r, g, b] };
  }

  /** Composite an accumulated color over the dark backdrop of the image. */
  function overBackdrop(out, offset, hit) {
    for (let c = 0; c < 3; c++) {
      const src = hit ? hit.color[c] * 255 : 0;
      const a = hit ? hit.alpha : 0;
      out[offset + c] = Math.round(src + BACKDROP[c] * (1 - a));
    }
    out[offset + 3] = 255;
  }

  // ------------------------------------------------------------- redrawing

  const plots = panelPlots(ctx.el, 1, {
    height: PLOT_HEIGHT, draw: () => drawPlot(),
  });
  // One plot, not a row of them, so nothing stops it running the whole width
  // of a slide - and a single curve stretched over 1600 pixels reads as a
  // horizon rather than as a reading of one ray. An explicit width, not just
  // a cap: the auto side margins are what centre it, and an auto margin on
  // the cross axis of a flex column also switches off the stretch that was
  // giving the strip its width.
  plots.strip.style.width = '760px';
  plots.strip.style.maxWidth = '100%';
  plots.strip.style.margin = '6px auto 0';

  let chosen = null;

  function rebuild() {
    if (!lattice) return;

    for (let j = 0; j < GRID; j++) {
      for (let i = 0; i < GRID; i++) {
        const dir = pixelCentre(i, j).sub(EYE).normalize();
        overBackdrop(image, (j * GRID + i) * 4, march(dir));
      }
    }
    imageTex.needsUpdate = true;

    const centre = pixelCentre(pixel % GRID, Math.floor(pixel / GRID));
    const dir = centre.clone().sub(EYE).normalize();
    chosen = march(dir);

    // The drawn ray stops where it leaves the block, or at the near face
    // when it misses - a ray shooting off past the edge of the frame reads
    // as a mistake rather than as a miss.
    const end = chosen ? chosen.t1 : (WORLD.z - EYE.z) / dir.z;
    ray.geometry.setFromPoints([
      EYE.clone(), EYE.clone().addScaledVector(dir, end),
    ]);

    const h = PLANE_HALF / GRID;
    const markZ = PLANE_AT + 0.006;
    marker.geometry.setFromPoints([
      new THREE.Vector3(centre.x - h, centre.y - h, markZ),
      new THREE.Vector3(centre.x + h, centre.y - h, markZ),
      new THREE.Vector3(centre.x + h, centre.y + h, markZ),
      new THREE.Vector3(centre.x - h, centre.y + h, markZ),
    ]);

    // The distinct lattice cells the samples landed in, outlined in place.
    const pos = cellEdges.attributes.position;
    let vertex = 0;
    if (chosen) {
      const sx = (2 * WORLD.x) / NX / 2;
      const sy = (2 * WORLD.y) / NY / 2;
      const sz = (2 * WORLD.z) / NZ / 2;
      const seen = new Set();
      const p = new THREE.Vector3();
      for (let s = 0; s < chosen.profile.length; s++) {
        p.copy(EYE).addScaledVector(dir, chosen.t0 + (s + 0.5) * chosen.dt);
        const i = Math.floor(((p.x + WORLD.x) / (2 * WORLD.x)) * NX);
        const j = Math.floor(((p.y + WORLD.y) / (2 * WORLD.y)) * NY);
        const k = Math.floor(((p.z + WORLD.z) / (2 * WORLD.z)) * NZ);
        if (i < 0 || j < 0 || k < 0 || i >= NX || j >= NY || k >= NZ) continue;
        const key = (k * NY + j) * NX + i;
        if (seen.has(key)) continue;
        seen.add(key);
        if (seen.size > MAX_CELLS) break;
        const cx = cellX(i);
        const cy = cellY(j);
        const cz = cellZ(k);
        for (const [a, b] of BOX_EDGES) {
          for (const corner of [a, b]) {
            pos.setXYZ(vertex++,
              cx + corner[0] * sx, cy + corner[1] * sy, cz + corner[2] * sz);
          }
        }
      }
    }
    cellEdges.setDrawRange(0, vertex);
    pos.needsUpdate = true;

    const m = new THREE.Matrix4();
    dots.count = 0;
    if (chosen) {
      // Never wider than the gap between two samples, and never so small
      // they stop being visible from the back row.
      const r = Math.max(0.006, Math.min(0.014, chosen.dt * 0.3));
      for (let s = 0; s < chosen.profile.length; s++) {
        const at = EYE.clone()
          .addScaledVector(dir, chosen.t0 + (s + 0.5) * chosen.dt);
        m.makeScale(r, r, r);
        m.setPosition(at);
        dots.setMatrixAt(s, m);
      }
      dots.count = chosen.profile.length;
      dots.instanceMatrix.needsUpdate = true;
    }

    drawPlot();
  }

  function drawPlot() {
    plots.resize();
    const g2d = plots.contexts[0];
    const { clientWidth: w } = plots.canvases[0];
    if (w < 1) return;
    const h = PLOT_HEIGHT;
    g2d.clearRect(0, 0, w, h);
    // Sized against the canvas: a caption locked to 14 px is legible on the
    // scrolling page and invisible on a projector.
    g2d.font = `600 ${Math.round(Math.min(22, Math.max(13, w / 40)))}px `
      + 'Urbanist, sans-serif';
    g2d.textBaseline = 'alphabetic';

    const swatch = 34;
    const pad = 4;
    const top = 10;
    const base = h - 22;
    const right = w - swatch - 16;

    if (!chosen) {
      g2d.fillStyle = MUTED;
      g2d.textAlign = 'left';
      g2d.fillText('this ray misses the volume, so its pixel stays empty',
        pad, base);
      return;
    }

    const n = chosen.profile.length;
    const x = (s) => pad + (s / Math.max(1, n - 1)) * (right - pad);
    const y = (v) => base - v * (base - top);

    g2d.beginPath();
    g2d.moveTo(x(0), base);
    for (let s = 0; s < n; s++) g2d.lineTo(x(s), y(chosen.profile[s]));
    g2d.lineTo(x(n - 1), base);
    g2d.closePath();
    g2d.fillStyle = 'rgba(141, 149, 163, 0.16)';
    g2d.fill();

    g2d.beginPath();
    for (let s = 0; s < n; s++) {
      const px = x(s);
      const py = y(chosen.profile[s]);
      if (s === 0) g2d.moveTo(px, py); else g2d.lineTo(px, py);
    }
    g2d.strokeStyle = MUTED;
    g2d.lineWidth = 1.8;
    g2d.stroke();

    g2d.fillStyle = HOT;
    for (let s = 0; s < n; s++) {
      g2d.beginPath();
      g2d.arc(x(s), y(chosen.profile[s]), 2, 0, Math.PI * 2);
      g2d.fill();
    }

    g2d.strokeStyle = '#dfe3ea';
    g2d.lineWidth = 1;
    g2d.beginPath();
    g2d.moveTo(pad, base);
    g2d.lineTo(right, base);
    g2d.stroke();

    const [r, gg, b] = chosen.color;
    const a = chosen.alpha;
    const mix = (c, i) => Math.round(c * 255 + BACKDROP[i] * (1 - a));
    g2d.fillStyle = `rgb(${mix(r, 0)},${mix(gg, 1)},${mix(b, 2)})`;
    g2d.fillRect(w - swatch - 2, top + 2, swatch, swatch);
    g2d.strokeStyle = '#c3c8d2';
    g2d.strokeRect(w - swatch - 2.5, top + 1.5, swatch + 1, swatch + 1);

    g2d.fillStyle = MUTED;
    g2d.textAlign = 'left';
    g2d.fillText('one value per block, along this one ray', pad, h - 5);
    g2d.textAlign = 'right';
    g2d.fillStyle = INK;
    g2d.fillText('its pixel', w - 2, h - 5);
  }

  // A dragged slider fires far faster than a frame, so the work is coalesced
  // to one rebuild per frame.
  let queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; rebuild(); });
  }

  /**
   * Start on a ray that has something to show.
   *
   * The middle of the image is not always it, and the centre pixel of a
   * mostly empty block is a flat line and a black swatch - a fair reading of
   * that ray and a poor first impression of the slide. Marching all of them
   * once and keeping the one that collected the most costs a few
   * milliseconds and lands on the animal every time.
   */
  function pickBestPixel() {
    let best = -1;
    for (let j = 0; j < GRID; j++) {
      for (let i = 0; i < GRID; i++) {
        const hit = march(pixelCentre(i, j).sub(EYE).normalize());
        if (!hit) continue;
        const score = hit.alpha
          * (hit.color[0] + hit.color[1] + hit.color[2]);
        if (score > best) {
          best = score;
          pixel = j * GRID + i;
        }
      }
    }
    pixelSlider?.set(pixel);
  }

  // One slider, walking the image in reading order. Two of them - one across
  // and one up - is the obvious design and the wrong one here: the point is
  // that EVERY pixel is a ray, and sweeping a single control through all of
  // them says that in a way setting two coordinates does not.
  // No readout. Which pixel it is and how many samples went into it are
  // numbers nobody in the room needs, and printed next to the control they
  // are three more things competing with the picture.
  pixelSlider = ui.slider('Pixel', {
    min: 0, max: GRID * GRID - 1, step: 1, value: pixel,
    format: () => '',
  }, (v) => { pixel = v; schedule(); });

  loadScan().then((texture) => {
    buildLattice(makeSampler(texture.image.data));
    pickBestPixel();
    rebuild();
  });
});
