// Level of detail: how a viewer shows a cloud it cannot possibly load.
//
// A scanned surface, cut into tiles. Every tile holds the same points in a
// fixed shuffled order, so drawing the first n of a tile is a valid sample of
// that tile at any n - which is the whole trick behind EPT, COPC and Potree.
//
// The observer is the red glyph in the scene, not you. Detail is spent
// relative to it, so you can orbit right round the arrangement and watch where
// the points went. If level of detail followed your own camera instead, every
// attempt to look at the effect would move it.
//
// The comparison is the point. Both modes draw the same number of points; they
// differ only in where they spend them.
//
//   Uniform     the same fraction from every tile. Fair, and wrong: most of
//               the budget goes on tiles that are far away and small on screen.
//   By distance  near tiles get most of it, far tiles get a few. The near
//               ground looks solid and the horizon stays sketchy - which is
//               exactly what you can see anyway.
//
// The tile outlines are the octree, drawn. This is also why the format matters
// more than the viewer: a plain .las has to be read end to end before anything
// appears, while a tiled one streams the tiles you are looking at.

import { defineScene, THREE, palette, ramp } from '../runtime.js';
import { makeEye } from '../eye.js';

const TILES = 5;            // per axis, across the ground
const PER_TILE = 9000;      // points held in each tile
const EXTENT = 3.0;

/** A rolling landscape - stands in for any scanned surface. */
function height(x, z) {
  return 0.34 * Math.sin(x * 1.1 + 0.4) * Math.cos(z * 0.9)
    + 0.18 * Math.sin(x * 2.3 - z * 1.7)
    + 0.07 * Math.sin(x * 5.1) * Math.sin(z * 4.3);
}

function rng(seed) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ELEVATION = [palette.plum, palette.teal, palette.sage, palette.amber,
  palette.roseLight];

defineScene('point-lod', ({ scene, ui, view }) => {
  view(0.5, 1.9, 4.2, 2.35, [0, -0.05, 0]);

  const eye = makeEye({ reach: 1.7 });
  scene.add(eye.group);
  let angle = -0.6;
  let eyeHeight = 0.55;

  const half = EXTENT / 2;
  const tileSize = EXTENT / TILES;
  const tiles = [];

  const outlines = new THREE.Group();
  scene.add(outlines);

  for (let tx = 0; tx < TILES; tx++) {
    for (let tz = 0; tz < TILES; tz++) {
      const x0 = -half + tx * tileSize;
      const z0 = -half + tz * tileSize;
      const rand = rng(1000 + tx * 37 + tz * 101);

      const positions = new Float32Array(PER_TILE * 3);
      const colors = new Float32Array(PER_TILE * 3);
      for (let i = 0; i < PER_TILE; i++) {
        // Random within the tile: a shuffled order by construction, so any
        // prefix is an even sample of the tile.
        const x = x0 + rand() * tileSize;
        const z = z0 + rand() * tileSize;
        const y = height(x, z);
        positions.set([x, y, z], i * 3);
        const c = ramp(ELEVATION, (y + 0.55) / 1.1);
        colors.set([c.r, c.g, c.b], i * 3);
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      const points = new THREE.Points(geo, new THREE.PointsMaterial({
        vertexColors: true, size: 0.014,
      }));
      scene.add(points);

      const centre = new THREE.Vector3(
        x0 + tileSize / 2,
        height(x0 + tileSize / 2, z0 + tileSize / 2),
        z0 + tileSize / 2,
      );
      tiles.push({ points, centre });

      // An octree cell is a box, so draw a box. A flat grid on the floor
      // would look like a floor and not like the thing that gets streamed.
      const outline = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(tileSize, 1.25, tileSize)),
        new THREE.LineBasicMaterial({
          color: '#9aa7b4', transparent: true, opacity: 0.3,
        }),
      );
      outline.position.set(centre.x, 0, centre.z);
      outlines.add(outline);
    }
  }

  const total = tiles.length * PER_TILE;
  let budget = Math.round(total * 0.07);
  let byDistance = true;
  const report = ui.readout('Drawn');

  function apply() {
    if (!byDistance) {
      const share = Math.floor(budget / tiles.length);
      for (const t of tiles) t.points.geometry.setDrawRange(0, share);
      report(`${(share * tiles.length).toLocaleString('en')} of `
        + `${total.toLocaleString('en')}`);
      return;
    }
    // Weight each tile by how close it is to the glyph, then hand out the
    // budget in proportion. A real implementation also weights by projected
    // size and by what is inside the frustum; this is the same idea with less
    // bookkeeping.
    let sum = 0;
    const weights = tiles.map((t) => {
      const w = 1 / (0.35 + t.centre.distanceToSquared(eye.position));
      sum += w;
      return w;
    });
    let drawn = 0;
    tiles.forEach((t, i) => {
      const n = Math.min(PER_TILE, Math.round((weights[i] / sum) * budget));
      t.points.geometry.setDrawRange(0, n);
      drawn += n;
    });
    report(`${drawn.toLocaleString('en')} of ${total.toLocaleString('en')}`);
  }

  ui.choice('Spend the budget', ['By distance', 'Uniformly'], (i) => {
    byDistance = i === 0;
    apply();
  });

  ui.slider('Viewer', {
    min: -Math.PI, max: Math.PI, step: 0.02, value: angle,
    format: () => '',
  }, (v) => { angle = v; eye.place(angle, eyeHeight, 2.0); apply(); });

  ui.slider('Viewer height', {
    min: 0.1, max: 2.0, step: 0.05, value: 0.55,
    format: (v) => v.toFixed(2),
  }, (v) => { eyeHeight = v; eye.place(angle, eyeHeight, 2.0); apply(); });

  ui.slider('Budget', {
    min: 0.01, max: 1, step: 0.01, value: 0.07,
    format: (v) => `${Math.round(v * 100)}%`,
  }, (v) => { budget = Math.round(total * v); apply(); });

  ui.toggle('Tiles', true, (on) => { outlines.visible = on; });

  eye.place(angle, eyeHeight, 2.0);
  apply();
});
