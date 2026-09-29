// The rules from the figure above, actually applied - cell by cell, across a
// real grid, in perspective rather than flat on the page.
//
// Two merged blobs, sampled on a grid. The highlighted cell is the one being
// processed right now: its four corners are read, the edges the threshold
// crosses are found by the same linear interpolation the figure used, and the
// segment that case calls for is added to the surface - permanently, next to
// every segment already emitted by an earlier cell. Let it run and the
// outline of the two blobs draws itself, one cell at a time, from nothing.
//
// The case logic is not a lookup table of 16 hand-drawn patterns; it is the
// three-line rule that table encodes - count which of the cell's four edges
// the threshold crosses, and connect them. Two crossings: one segment between
// them. Four: the diagonal-corner case the figure calls out as ambiguous,
// resolved here the same way, every time it comes up.
//
// Threshold coloring makes the corners binary, and the surface follows: every
// crossing lands at the exact midpoint of its edge, because that is what
// interpolating between two equal-magnitude opposite values always gives -
// the staircase the rest of this deck's binary-mask slides warn about.
// Intensity coloring restores the real corner values, and the crossings move
// to where the field actually is.

import { defineScene, THREE, palette } from '../runtime.js';

const NX = 16;
const NZ = 10;
const X0 = -2.4;
const X1 = 2.4;
const Z0 = -1.5;
const Z1 = 1.5;
const DX = (X1 - X0) / NX;
const DZ = (Z1 - Z0) / NZ;
const TOTAL = NX * NZ;
const STEP_RATE = 8; // cells per second
const LINE_HALF_WIDTH = 0.032;

function field(x, z) {
  const d1 = (x + 0.9) ** 2 + z ** 2 + 0.001;
  const d2 = (x - 0.85) ** 2 + (z - 0.2) ** 2 + 0.001;
  return (1.15 ** 2) / d1 + (0.95 ** 2) / d2 - 1;
}

function crossFrac(v0, v1) {
  if ((v0 > 0) === (v1 > 0)) return null;
  return v0 / (v0 - v1);
}

defineScene('marching-squares-sweep', ({ scene, ui, view }) => {
  view(1.0, 1.7, 1.4, 2.95);

  const gridVal = [];
  for (let j = 0; j <= NZ; j++) {
    const row = [];
    for (let i = 0; i <= NX; i++) row.push(field(X0 + i * DX, Z0 + j * DZ));
    gridVal.push(row);
  }

  /**
   * One cell's crossings and the segment(s) they call for.
   *
   * `binary` reduces every corner to its sign before interpolating, which is
   * the whole difference between a smooth surface and a staircase: crossing
   * two equal-and-opposite values always lands at 0.5, regardless of how
   * close the real field actually was to the edge.
   */
  function analyze(i, j, binary) {
    const tl = gridVal[j][i];
    const tr = gridVal[j][i + 1];
    const br = gridVal[j + 1][i + 1];
    const bl = gridVal[j + 1][i];
    const sign = (v) => (v > 0 ? 1 : -1);
    const [vtl, vtr, vbr, vbl] = binary
      ? [sign(tl), sign(tr), sign(br), sign(bl)]
      : [tl, tr, br, bl];

    const x0 = X0 + i * DX;
    const x1 = X0 + (i + 1) * DX;
    const z0 = Z0 + j * DZ;
    const z1 = Z0 + (j + 1) * DZ;

    const tTop = crossFrac(vtl, vtr);
    const tRight = crossFrac(vtr, vbr);
    const tBottom = crossFrac(vbr, vbl);
    const tLeft = crossFrac(vbl, vtl);

    const top = tTop !== null ? [x0 + (x1 - x0) * tTop, z0] : null;
    const right = tRight !== null ? [x1, z0 + (z1 - z0) * tRight] : null;
    const bottom = tBottom !== null ? [x1 + (x0 - x1) * tBottom, z1] : null;
    const left = tLeft !== null ? [x0, z1 + (z0 - z1) * tLeft] : null;

    const crossed = [top, right, bottom, left].filter(Boolean);
    const n = [tl, tr, br, bl].filter((v) => v > 0).length;
    const segs = [];
    if (crossed.length === 2) {
      segs.push([crossed[0], crossed[1]]);
    } else if (crossed.length === 4) {
      // The ambiguous case: two diagonal corners in, two out, four crossings.
      // Resolved by pairing each inside corner with its own two edges - same
      // resolution every time this pattern comes up.
      if (tl > 0) segs.push([top, left], [right, bottom]);
      else segs.push([top, right], [left, bottom]);
    }
    return { segs, n, ambiguous: crossed.length === 4, x0, x1, z0, z1 };
  }

  function label({ n, ambiguous }) {
    if (n === 0) return 'Empty cell - no crossing, nothing drawn.';
    if (n === 4) return 'Full cell - no crossing, nothing drawn.';
    if (ambiguous) return 'Ambiguous: four crossings, two ways to pair them.';
    return `${n} corner${n === 1 ? '' : 's'} in - two crossings, one segment.`;
  }

  // The full grid, faint, so the sweep reads as moving across something
  // rather than drawing on emptiness.
  {
    const pts = [];
    for (let i = 0; i <= NX; i++) pts.push(X0 + i * DX, 0, Z0, X0 + i * DX, 0, Z1);
    for (let j = 0; j <= NZ; j++) pts.push(X0, 0, Z0 + j * DZ, X1, 0, Z0 + j * DZ);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    scene.add(new THREE.LineSegments(geo,
      new THREE.LineBasicMaterial({ color: palette.light, transparent: true, opacity: 0.5 })));
  }

  // Every grid point, as a small square rather than a dot - a pixel the way
  // a pixel actually looks, tiled edge to edge with a hairline gap so the
  // grid still reads through. Colored two ways - the toggle below picks
  // which - and both deliberately muted: this is the backdrop the surface
  // gets drawn on top of, not the subject.
  //
  // Intensity: the actual value. A blob's own center runs to +1300 or more,
  // and a linear scale spends almost its whole range on the handful of
  // points anywhere near one - everything else, which is most of the grid
  // and everything actually near the threshold, collapses to two flat
  // colors. log1p on the positive side fixes that: steep right where the
  // threshold is, compressing the long climb into a center into a small
  // stretch of color at the bright end, the way a display window does on a
  // real scan.
  //
  // Threshold: no gradient at all, one color on each side of zero - the
  // question the intensity view makes you squint for, answered directly.
  const LOW = new THREE.Color(palette.dark);
  const HIGH = new THREE.Color(palette.amberLight);
  const INSIDE = new THREE.Color(palette.amberLight);
  const OUTSIDE = new THREE.Color(palette.dark);
  const NEG_FLOOR = -1;     // as negative as this grid's background gets
  const POS_CEIL = 10;      // log1p(10) - past here, color stops climbing
  const FADE = 0.6;         // how far the threshold colors are pulled toward white
  const INTENSITY_FADE = 0.3; // the gradient needs less fading to stay readable

  const white = new THREE.Color(0xffffff);
  function fade(c, amount = FADE) { return c.clone().lerp(white, amount); }

  function intensityColor(v) {
    let t;
    if (v <= 0) {
      t = 0.5 * Math.min(1, Math.max(0, (v - NEG_FLOOR) / -NEG_FLOOR));
    } else {
      t = 0.5 + 0.5 * Math.min(1, Math.log1p(v) / Math.log1p(POS_CEIL));
    }
    return fade(LOW.clone().lerp(HIGH, t), INTENSITY_FADE);
  }

  const pixelsGeo = new THREE.BufferGeometry();
  {
    const hw = (DX / 2) * 0.88;
    const hd = (DZ / 2) * 0.88;
    const n = (NX + 1) * (NZ + 1);
    const pos = new Float32Array(n * 4 * 3);
    const intensityCol = new Float32Array(n * 4 * 3);
    const thresholdCol = new Float32Array(n * 4 * 3);
    const index = new Uint32Array(n * 6);

    const insideFaded = fade(INSIDE);
    const outsideFaded = fade(OUTSIDE);

    let p = 0;
    for (let j = 0; j <= NZ; j++) {
      for (let i = 0; i <= NX; i++) {
        const cx = X0 + i * DX;
        const cz = Z0 + j * DZ;
        const v = gridVal[j][i];
        const ic = intensityColor(v);
        const tc = v > 0 ? insideFaded : outsideFaded;
        const base = p * 4;
        const corners = [
          [cx - hw, cz - hd], [cx + hw, cz - hd],
          [cx + hw, cz + hd], [cx - hw, cz + hd],
        ];
        for (let c = 0; c < 4; c++) {
          const vi = (base + c) * 3;
          pos[vi] = corners[c][0]; pos[vi + 1] = 0.005; pos[vi + 2] = corners[c][1];
          intensityCol[vi] = ic.r; intensityCol[vi + 1] = ic.g; intensityCol[vi + 2] = ic.b;
          thresholdCol[vi] = tc.r; thresholdCol[vi + 1] = tc.g; thresholdCol[vi + 2] = tc.b;
        }
        const ii = p * 6;
        index[ii] = base; index[ii + 1] = base + 1; index[ii + 2] = base + 2;
        index[ii + 3] = base; index[ii + 4] = base + 2; index[ii + 5] = base + 3;
        p++;
      }
    }
    pixelsGeo.setIndex(new THREE.BufferAttribute(index, 1));
    pixelsGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    pixelsGeo.setAttribute('color', new THREE.BufferAttribute(intensityCol, 3));
    pixelsGeo.userData.intensityCol = intensityCol;
    pixelsGeo.userData.thresholdCol = thresholdCol;
    scene.add(new THREE.Mesh(pixelsGeo,
      new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })));
  }

  // The emitted surface itself, as a ribbon of quads rather than a
  // THREE.Line: line width is a WebGL setting almost no driver honors, and a
  // one-pixel line is exactly what would get lost against a grid of solid
  // pixels. A small square at every joint covers the seam between one
  // segment's ribbon and the next.
  const segGeom = new THREE.BufferGeometry();
  scene.add(new THREE.Mesh(segGeom,
    new THREE.MeshBasicMaterial({ color: palette.blue, side: THREE.DoubleSide })));

  function addRibbon(positions, p0, p1, y) {
    const dx = p1[0] - p0[0];
    const dz = p1[1] - p0[1];
    const len = Math.hypot(dx, dz) || 1e-6;
    const nx = (-dz / len) * LINE_HALF_WIDTH;
    const nz = (dx / len) * LINE_HALF_WIDTH;
    const base = positions.length / 3;
    positions.push(
      p0[0] + nx, y, p0[1] + nz,
      p0[0] - nx, y, p0[1] - nz,
      p1[0] - nx, y, p1[1] - nz,
      p1[0] + nx, y, p1[1] + nz,
    );
    return [base, base + 1, base + 2, base, base + 2, base + 3];
  }

  function addJoint(positions, p, y) {
    const w = LINE_HALF_WIDTH;
    const base = positions.length / 3;
    positions.push(
      p[0] - w, y, p[1] - w,
      p[0] + w, y, p[1] - w,
      p[0] + w, y, p[1] + w,
      p[0] - w, y, p[1] + w,
    );
    return [base, base + 1, base + 2, base, base + 2, base + 3];
  }

  const highlightGeom = new THREE.BufferGeometry();
  scene.add(new THREE.LineLoop(highlightGeom,
    new THREE.LineBasicMaterial({ color: palette.accent })));

  const report = ui.readout('Cell');
  const say = ui.note();

  let step = 0;
  let playing = true;
  let playStartT = null;
  let playStartStep = 0;
  let binaryMode = true;

  function render(s) {
    step = ((s % TOTAL) + TOTAL) % TOTAL;

    const positions = [];
    const index = [];
    let current = null;
    for (let k = 0; k <= step; k++) {
      const j = Math.floor(k / NX);
      const i = k % NX;
      const a = analyze(i, j, binaryMode);
      if (k === step) current = a;
      for (const [p0, p1] of a.segs) {
        index.push(...addRibbon(positions, p0, p1, 0.02));
        index.push(...addJoint(positions, p0, 0.02));
        index.push(...addJoint(positions, p1, 0.02));
      }
    }
    segGeom.setAttribute('position', new THREE.Float32BufferAttribute(
      positions.length ? positions : [0, 0, 0, 0, 0, 0, 0, 0, 0], 3,
    ));
    segGeom.setIndex(index.length ? index : [0, 1, 2]);
    segGeom.computeBoundingSphere();

    const { x0, x1, z0, z1 } = current;
    highlightGeom.setAttribute('position', new THREE.Float32BufferAttribute([
      x0, 0.03, z0, x1, 0.03, z0, x1, 0.03, z1, x0, 0.03, z1,
    ], 3));

    report(`${step + 1} / ${TOTAL}`);
    say(label(current));
  }

  render(0);

  ui.choice('Coloring', ['Intensity', 'Threshold'], (i) => {
    pixelsGeo.setAttribute('color', new THREE.BufferAttribute(
      i === 0 ? pixelsGeo.userData.intensityCol : pixelsGeo.userData.thresholdCol, 3,
    ));
    binaryMode = i === 1;
    render(step);
  }, 1);

  ui.toggle('Play', true, (on) => { playing = on; playStartT = null; });

  let scrubbed = false;
  ui.slider('Jump to cell', {
    min: 0, max: TOTAL - 1, step: 1, value: 0,
    format: (v) => `${Math.round(v) + 1} / ${TOTAL}`,
  }, (v) => {
    render(Math.round(v));
    if (scrubbed) playing = false;
    scrubbed = true;
  });

  return {
    tick(t) {
      if (!playing) return;
      if (playStartT === null) { playStartT = t; playStartStep = step; }
      const target = playStartStep + Math.floor((t - playStartT) * STEP_RATE);
      if (((target % TOTAL) + TOTAL) % TOTAL !== step) render(target);
    },
  };
});
