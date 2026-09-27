// Level of detail: which depth of the octree a viewer actually draws, where.
//
// The data is a real one: a tributary canyon system in Grand Canyon National
// Park, from USGS airborne lidar - 154,000 points out of a public,
// 22-billion-point dataset, already shipped as an Entwine octree because that
// is how USGS serves it. tools/make-canyon-points.py fetches and crops it,
// tools/make-canyon-octree.py builds the octree this scene walks. Vertical
// relief is exaggerated 3x, or the real canyon reads as almost flat from this
// angle - said here once rather than left for someone to wonder about.
//
// What an octree node holds, and why it matters here: one point per cell of a
// lattice laid over the node's box, and only points no ancestor already took.
// So a node is a sample of its own region at its own resolution, and drawing
// a node together with its ancestors gives that region at full density. A
// viewer can therefore stop descending anywhere and still have a complete
// picture - coarser, not holey - and it never re-fetches a point it has.
//
// The observer is the red glyph in the scene, not you. Detail is spent
// relative to it, so you can orbit right round the arrangement and watch
// where the depth went. If level of detail followed your own camera instead,
// every attempt to look at the effect would move it.
//
// The two modes both draw the same number of points and differ only in which
// nodes they spend them on:
//
//   By distance   Potree's own loop. Start at the root, repeatedly draw
//                 whichever pending node looks biggest from the glyph
//                 (its half-size over its distance) and queue that node's
//                 children. The budget runs out while far nodes are still
//                 shallow, so the cut through the tree is deep near the
//                 glyph and shallow at the horizon.
//   Same depth    Fill the tree level by level instead. Every region gets
//                 the same resolution, the far ones get detail nobody can
//                 see, and the near ground is the coarser for it.
//
// The boxes are the nodes actually being drawn, colored by their depth - so
// the cut through the tree is the thing you are looking at, not an inference.

import { defineScene, THREE, palette, ramp } from '../runtime.js';
import { makeEye } from '../eye.js';

const DATA = '../../../data/canyon-octree.bin';
const RECORD = 40;               // bytes per node record, see the prep script
const MAX_DEPTH = 5;             // deepest level the prep script produced

// One color per octree depth, coarse to fine. Read as a legend on the boxes.
const DEPTH_COLORS = [
  palette.plum, palette.iceDeep, palette.teal, palette.sage,
  palette.amber, palette.rose,
];
const ELEVATION = [palette.plum, palette.teal, palette.sage, palette.amber,
  palette.roseLight];

/** tools/make-canyon-octree.py's file: a node table, then the positions. */
async function loadOctree() {
  const buf = await fetch(new URL(DATA, import.meta.url)).then((r) => r.arrayBuffer());
  const head = new Uint32Array(buf, 0, 2);
  const [nodeCount, pointCount] = head;
  const nodes = [];
  for (let i = 0; i < nodeCount; i++) {
    const o = 8 + i * RECORD;
    const f = new Float32Array(buf, o, 4);
    const u = new Uint32Array(buf, o + 16, 3);
    const parent = new Int32Array(buf, o + 28, 1)[0];
    const kids = new Uint32Array(buf, o + 32, 2);
    nodes.push({
      centre: new THREE.Vector3(f[0], f[1], f[2]),
      half: f[3],
      depth: u[0],
      first: u[1],
      count: u[2],
      parent,
      childStart: kids[0],
      childCount: kids[1],
    });
  }
  const positions = new Float32Array(buf, 8 + nodeCount * RECORD, pointCount * 3);
  return { nodes, positions, pointCount };
}

/** The 12 edges of a unit cube, as pairs of corner signs. */
const CUBE_EDGES = (() => {
  const corners = [];
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) corners.push([x, y, z]);
  const edges = [];
  for (let a = 0; a < 8; a++) {
    for (let b = a + 1; b < 8; b++) {
      const diff = corners[a].reduce((n, v, i) => n + (v !== corners[b][i] ? 1 : 0), 0);
      if (diff === 1) edges.push([corners[a], corners[b]]);
    }
  }
  return edges;
})();

defineScene('point-lod', ({ scene, ui, view }) => {
  view(1.0, 1.15, 3.8, 1.8, [0, -0.05, 0]);

  const eye = makeEye({ reach: 0.5, spread: 0.5 });
  scene.add(eye.group);
  let angle = -0.6;
  const eyeHeight = 0.62;   // fixed: it was a knob nobody needed

  let tree = null;
  let budget = 0;
  let byDistance = true;
  let colorByDepth = true;
  let showBoxes = true;

  // One draw call for the points and one for the boxes. Both buffers are
  // allocated for the whole cloud once and refilled in place, because the
  // selection changes on every drag of every slider.
  const drawPositions = new THREE.BufferGeometry();
  const boxGeometry = new THREE.BufferGeometry();
  let posArray = null;
  let colArray = null;
  let boxPos = null;
  let boxCol = null;

  const points = new THREE.Points(drawPositions, new THREE.PointsMaterial({
    vertexColors: true, size: 0.016,
  }));
  scene.add(points);

  const boxes = new THREE.LineSegments(boxGeometry, new THREE.LineBasicMaterial({
    vertexColors: true, transparent: true, opacity: 0.75,
  }));

  // The root box is a cube three units tall over a canyon less than one unit
  // deep, because every one of these formats starts from a cubic root - so
  // the coarse boxes are mostly empty air, and drawn at full strength they
  // are all you see. Fading them by depth leaves the nesting visible and
  // lets the fine boxes near the glyph, which are the point, come forward.
  const PAPER = new THREE.Color(palette.paper);
  const fade = (depth) => 0.22 + 0.78 * (depth / MAX_DEPTH);
  scene.add(boxes);

  const report = ui.readout('Drawn');
  let describe = () => {};

  /** Potree's loop: always descend into whatever looks biggest from the glyph. */
  function selectByDistance() {
    const { nodes } = tree;
    const pending = [0];
    const chosen = [];
    let spent = 0;
    const score = (i) => nodes[i].half / Math.max(0.05, nodes[i].centre.distanceTo(eye.position));
    while (pending.length) {
      let best = 0;
      for (let k = 1; k < pending.length; k++) {
        if (score(pending[k]) > score(pending[best])) best = k;
      }
      const i = pending.splice(best, 1)[0];
      if (spent + nodes[i].count > budget) break;
      chosen.push(i);
      spent += nodes[i].count;
      for (let c = 0; c < nodes[i].childCount; c++) pending.push(nodes[i].childStart + c);
    }
    return chosen;
  }

  /** Level by level, which is what "no level of detail" actually looks like. */
  function selectUniform() {
    const { nodes } = tree;
    const chosen = [];
    let spent = 0;
    // The node table is already breadth-first, so walking it in order fills
    // each depth completely before starting the next.
    for (let i = 0; i < nodes.length; i++) {
      if (spent + nodes[i].count > budget) break;
      chosen.push(i);
      spent += nodes[i].count;
    }
    return chosen;
  }

  function apply() {
    if (!tree) return;
    const { nodes, positions } = tree;
    const chosen = byDistance ? selectByDistance() : selectUniform();

    let n = 0;
    let minDepth = MAX_DEPTH;
    let maxDepth = 0;
    const c = new THREE.Color();
    for (const i of chosen) {
      const node = nodes[i];
      minDepth = Math.min(minDepth, node.depth);
      maxDepth = Math.max(maxDepth, node.depth);
      const depthColor = DEPTH_COLORS[Math.min(node.depth, DEPTH_COLORS.length - 1)];
      for (let p = 0; p < node.count; p++) {
        const src = (node.first + p) * 3;
        posArray[n * 3] = positions[src];
        posArray[n * 3 + 1] = positions[src + 1];
        posArray[n * 3 + 2] = positions[src + 2];
        if (colorByDepth) {
          c.set(depthColor);
        } else {
          // Elevation is already centred on its own mean by the prep script;
          // the fixed window keeps the ramp stable as the selection changes.
          c.copy(ramp(ELEVATION,
            THREE.MathUtils.clamp((positions[src + 1] + 0.4) / 0.8, 0, 1)));
        }
        colArray[n * 3] = c.r;
        colArray[n * 3 + 1] = c.g;
        colArray[n * 3 + 2] = c.b;
        n++;
      }
    }
    drawPositions.setDrawRange(0, n);
    drawPositions.attributes.position.needsUpdate = true;
    drawPositions.attributes.color.needsUpdate = true;

    let e = 0;
    for (const i of chosen) {
      const node = nodes[i];
      c.set(DEPTH_COLORS[Math.min(node.depth, DEPTH_COLORS.length - 1)]);
      c.lerp(PAPER, 1 - fade(node.depth));
      for (const [a, b] of CUBE_EDGES) {
        for (const corner of [a, b]) {
          boxPos[e * 3] = node.centre.x + corner[0] * node.half;
          boxPos[e * 3 + 1] = node.centre.y + corner[1] * node.half;
          boxPos[e * 3 + 2] = node.centre.z + corner[2] * node.half;
          boxCol[e * 3] = c.r;
          boxCol[e * 3 + 1] = c.g;
          boxCol[e * 3 + 2] = c.b;
          e++;
        }
      }
    }
    boxGeometry.setDrawRange(0, e);
    boxGeometry.attributes.position.needsUpdate = true;
    boxGeometry.attributes.color.needsUpdate = true;
    boxes.visible = showBoxes;

    report(`${n.toLocaleString('en')} of ${tree.pointCount.toLocaleString('en')}`
      + ` · ${chosen.length} nodes`);
  }

  ui.choice('Spend the budget', ['By distance', 'Same depth'], (i) => {
    byDistance = i === 0;
    apply();
  });

  ui.slider('Viewer', {
    min: -Math.PI, max: Math.PI, step: 0.02, value: angle,
    format: () => '',
  }, (v) => { angle = v; eye.place(angle, eyeHeight, 2.0); apply(); });

  const budgetSlider = ui.slider('Budget', {
    min: 0.01, max: 1, step: 0.01, value: 0.12,
    format: (v) => `${Math.round(v * 100)}%`,
  }, (v) => { budget = Math.round((tree ? tree.pointCount : 0) * v); apply(); });

  ui.choice('Color', ['Octree depth', 'Elevation'], (i) => {
    colorByDepth = i === 0;
    apply();
  });

  ui.toggle('Nodes', true, (on) => { showBoxes = on; boxes.visible = on && !!tree; });

  describe = ui.note('');

  eye.place(angle, eyeHeight, 2.0);

  loadOctree().then((loaded) => {
    tree = loaded;
    posArray = new Float32Array(loaded.pointCount * 3);
    colArray = new Float32Array(loaded.pointCount * 3);
    drawPositions.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    drawPositions.setAttribute('color', new THREE.BufferAttribute(colArray, 3));
    // Worst case every node is drawn; 12 edges, 2 vertices each.
    boxPos = new Float32Array(loaded.nodes.length * 24 * 3);
    boxCol = new Float32Array(loaded.nodes.length * 24 * 3);
    boxGeometry.setAttribute('position', new THREE.BufferAttribute(boxPos, 3));
    boxGeometry.setAttribute('color', new THREE.BufferAttribute(boxCol, 3));
    budgetSlider.set(0.12);
  });
});
