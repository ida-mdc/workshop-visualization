// What each storage layout has to read, for four different things you ask for.
//
// One 1024³ uint16 volume, 2.1 GB, stored four ways. Pick a request and read
// the size printed under each block: the layout decides the cost, not the
// viewer.
//
// The pair to point at is the two slices. Plane per file is the cheapest way
// to get an xy slice and the most expensive way to get an xz one, because
// every plane contributes a single row to it.
//
// Three things the drawing has to get right:
//
//   A PLANE is one thickness in every view. Reading one plane and reading the
//   whole stack have to draw the same object, or the picture contradicts the
//   number under it - and the planes need gaps, or the stack merges into one
//   grey block and stops saying "a stack of files".
//
//   The PYRAMID looks like a pyramid - the full-resolution box with a half-
//   size and a quarter-size copy stacked above it. Drawn as one box it is
//   indistinguishable from plain chunking, which is the whole difference the
//   panel exists to show.
//
//   The SIZES sit under the blocks. Next to the buttons nobody finds them.

import { defineScene, THREE, panelStrip, spreadPanels, panelOrbit } from '../runtime.js';

const SPAN = 1.3;               // side of the full-resolution box
const GRID = 8;                 // chunks per axis
const CELL = SPAN / GRID;
const FILL = 0.86;              // cell size as a fraction of its slot

// Planes drawn in the stack. A drawn plane is a file, and it is that thickness
// in every view - one plane read for an xy slice has to be the same object as
// one plane of the stack, or the picture argues with the number under it.
// 24 divides by 8, so the 128-plane slab a close-up region needs is exactly
// three of them.
const PLANES = 24;
const PLANE_STEP = SPAN / PLANES;
// Thinner than a chunk is of its slot: the air between the plates is what
// makes the stack read as separate files rather than one striped block.
const PLANE_FILL = 0.55;
const CHUNK_MB = 4.194;         // 128³ uint16
const PLANE_MB = 2.097;         // one 1024² plane, uint16
const TOTAL_MB = 2147;
const COARSE = 2;               // pyramid level used when zoomed out

// On white. Grayscale rather than two blues: at the coarse level's actual
// render size the lightened blue this used to be read as flat grey anyway
// (the lighting desaturated it), so a "coarse copy" read looked identical to
// "not read at all". Dark vs mid-grey keeps that same reading but makes it
// true instead of accidental.
//
// The wireframe (unread storage) has to sit clearly *between* white and the
// solid fills, not disappear next to either - it is the thing that shows how
// much of the whole was skipped. Too faint and a fetched cell reads as
// floating in empty space instead of "the one part of this structure that
// was actually read".
//
// Not palette.dark for the fill any more. These boxes are axis-aligned, so
// every visible face is flat-lit, and at 1.6% albedo the deck's near-black
// gave the top face about as much light as the sides - four black
// silhouettes with no form at all. A dark slate still reads as "the full
// resolution" next to the coarse grey, and has enough albedo left for the
// overhead light below to separate the top face from the sides.
const FINE = '#4b4c5b';
const COARSE_COL = '#6b6c78';
const EDGE = '#53545f';

// The three boxes of the pyramid panel, bottom to top: side, chunks per axis,
// and the gap above the box below it.
const LEVELS = [
  { side: SPAN, grid: GRID, gap: 0 },
  { side: SPAN / 2, grid: GRID / 2, gap: 0.08 },
  { side: SPAN / 4, grid: GRID / 4, gap: 0.06 },
];

// The full-resolution box sits at the panel's origin, the same place the other
// three panels put theirs, so all four are directly comparable and every panel
// turns about the box you are comparing. The coarser copies stack above it.
let cursor = SPAN / 2;
for (const [i, level] of LEVELS.entries()) {
  if (i === 0) { level.centre = 0; continue; }
  cursor += level.gap + level.side / 2;
  level.centre = cursor;
  cursor += level.side / 2;
}
/** Middle of everything a panel can draw, which is what the camera looks at. */
const FOCUS = (-SPAN / 2 + cursor) / 2;

const LAYOUTS = [
  { key: 'one', title: 'one array',
    body: 'A single array file.' },
  { key: 'planes', title: 'plane per file',
    body: 'A stack of planes.' },
  { key: 'chunks', title: 'chunked',
    body: 'Divided in all spatial dimensions.' },
  { key: 'pyramid', title: 'chunked + pyramid',
    body: 'Same, plus downscaled copies for when you are zoomed out.' },
];

// Everything here is a question about drawing a picture, never about reading
// the data for analysis - hence the label on the control.
const REQUESTS = [
  { key: 'whole', label: 'The whole volume' },
  { key: 'xy', label: 'An xy slice' },
  { key: 'xz', label: 'An xz slice' },
  { key: 'mid', label: 'Zoomed in halfway' },
  { key: 'region', label: 'A region, up close' },
];

// Which copy the pyramid reads from. Zoomed out, a quarter-size copy is
// already finer than the screen; halfway in, the half-size one is; up close,
// nothing but the full-resolution copy will do. This is the whole reason the
// coarser copies are worth their disk.
const PYRAMID_LEVEL = { region: 0, mid: 1 };

/**
 * What a layout has to read for a request: the megabytes, and what to light.
 *
 * `level` indexes LEVELS, so the pyramid panel lights a cell in whichever of
 * its three boxes the read actually comes from.
 */
function plan(layout, request) {
  if (layout === 'one') return { mb: TOTAL_MB, solid: true };

  const run = (from, count) => [...Array(count).keys()].map((n) => from + n);

  if (layout === 'planes') {
    // A plane is a file, so the smallest thing this layout can read is one
    // whole plane - and an xz slice needs a row out of every one of them.
    const middle = PLANES >> 1;
    if (request === 'xy') return { mb: PLANE_MB, planes: [middle] };
    if (request === 'region') {
      const slab = PLANES / 8;                    // 128 planes of 1024
      return { mb: 128 * PLANE_MB, planes: run(middle - (slab >> 1), slab) };
    }
    if (request === 'mid') {
      // Half the extent on every axis, so half the files.
      return { mb: 512 * PLANE_MB, planes: run(PLANES / 4, PLANES / 2) };
    }
    return { mb: TOTAL_MB, planes: [...Array(PLANES).keys()] };
  }

  // Chunked, with or without the coarser copies to fall back on.
  const level = layout === 'pyramid' ? (PYRAMID_LEVEL[request] ?? COARSE) : 0;
  const g = GRID >> level;
  const mid = (n) => n === (g >> 1);
  const near = (n) => n === (g >> 1) - 1 || n === (g >> 1);
  const half = (n) => n >= g / 4 && n < (3 * g) / 4;
  const cells = [];
  for (let i = 0; i < g; i++) {
    for (let j = 0; j < g; j++) {
      for (let k = 0; k < g; k++) {
        const take = request === 'whole' ? true
          : request === 'xy' ? mid(j)
            : request === 'xz' ? mid(k)
              : request === 'mid' ? half(i) && half(j) && half(k)
                : near(i) && near(j) && near(k);
        if (take) cells.push([i, j, k]);
      }
    }
  }
  const mb = request === 'whole' ? g ** 3 * CHUNK_MB
    : request === 'region' ? 8 * CHUNK_MB
      : request === 'mid' ? (g / 2) ** 3 * CHUNK_MB
        : g * g * CHUNK_MB;
  return { mb, cells, level };
}

function size(mb) {
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB`
    : mb >= 1 ? `${Math.round(mb)} MB` : `${Math.round(mb * 1000)} kB`;
}

/** A box drawn as edges only - storage the request reads nothing from. */
function wireBox(side, centreY) {
  const box = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(side, side, side)),
    new THREE.LineBasicMaterial({ color: EDGE, transparent: true, opacity: 0.75 }),
  );
  box.position.y = centreY;
  return box;
}

defineScene('chunk-fetch', (ctx) => {
  const { scene, projection, frustum, view, controls, ui } = ctx;
  const camera = projection('orthographic');
  // Wide enough that four turned panels keep their distance, tall enough for
  // the pyramid. A box of side SPAN turned by the angles below spans about
  // 1.35 * SPAN, and spreadPanels gives each panel a quarter of the width.
  // The camera looks at FOCUS rather than the origin: the boxes are aligned
  // on the origin and the pyramid grows upwards from it, so the picture is
  // not centred on the thing the panels are anchored to.
  frustum(2.9, 8.0);
  view(0, FOCUS, 3.4, null, [0, FOCUS, 0]);
  controls.enabled = false;
  for (let i = 1; i <= LAYOUTS.length; i++) camera.layers.enable(i);
  ctx.el.style.background = '#ffffff';

  // An overhead light on top of the shared studio rig, almost straight down,
  // so an upward-facing face gets nearly all of it and a side face almost
  // none. The whole scene is flat boxes seen from a fixed angle; without a
  // strong up/side split they read as flat shapes rather than volumes.
  const overhead = new THREE.DirectionalLight(0xffffff, 4.0);
  overhead.position.set(0.9, 9, 2.2);
  scene.add(overhead);

  const strip = panelStrip(ctx.el,
    LAYOUTS.map((l) => ({ title: l.title, body: l.body })), { numbered: false });

  // The number each panel exists to report, under the panel it belongs to.
  const sizeLabels = [...strip.children].map((cell) => {
    const el = document.createElement('span');
    el.className = 'viz3d-panel-size';
    cell.insertBefore(el, cell.querySelector('.viz3d-panel-body'));
    return el;
  });

  let request = 'whole';

  const panels = LAYOUTS.map((l, i) => {
    const group = new THREE.Group();
    scene.add(group);
    if (l.key === 'pyramid') {
      for (const level of LEVELS) group.add(wireBox(level.side, level.centre));
    } else {
      group.add(wireBox(SPAN, 0));
    }
    const held = new THREE.Group();
    group.add(held);
    group.traverse((o) => o.layers.set(i + 1));
    return { group, held, layout: l.key, index: i };
  });

  function rebuild() {
    for (const p of panels) {
      for (const c of p.held.children) { c.geometry.dispose(); c.material.dispose(); }
      p.held.clear();

      const { mb, solid, planes, cells, level = 0 } = plan(p.layout, request);
      const mat = new THREE.MeshStandardMaterial({
        color: level ? COARSE_COL : FINE, roughness: 0.55,
      });
      let mesh;

      if (solid) {
        // One array is one object. Subdividing it would say the opposite.
        mesh = new THREE.Mesh(new THREE.BoxGeometry(SPAN, SPAN, SPAN), mat);
      } else if (planes) {
        const geo = new THREE.BoxGeometry(SPAN, PLANE_STEP * PLANE_FILL, SPAN);
        mesh = new THREE.InstancedMesh(geo, mat, planes.length);
        const m = new THREE.Matrix4();
        planes.forEach((j, n) => {
          m.makeTranslation(0, -SPAN / 2 + (j + 0.5) * PLANE_STEP, 0);
          mesh.setMatrixAt(n, m);
        });
        mesh.instanceMatrix.needsUpdate = true;
      } else {
        const lv = p.layout === 'pyramid' ? LEVELS[level] : LEVELS[0];
        const step = lv.side / lv.grid;
        const half = lv.side / 2;
        const base = p.layout === 'pyramid' ? lv.centre : 0;
        const geo = new THREE.BoxGeometry(step * FILL, step * FILL, step * FILL);
        mesh = new THREE.InstancedMesh(geo, mat, cells.length);
        const m = new THREE.Matrix4();
        cells.forEach(([i, j, k], n) => {
          m.makeTranslation(-half + (i + 0.5) * step,
            base - half + (j + 0.5) * step,
            -half + (k + 0.5) * step);
          mesh.setMatrixAt(n, m);
        });
        mesh.instanceMatrix.needsUpdate = true;
      }

      mesh.layers.set(p.index + 1);
      p.held.add(mesh);
      sizeLabels[p.index].textContent = size(mb);
    }
  }

  ui.choice('Visualization request', REQUESTS.map((r) => r.label), (i) => {
    request = REQUESTS[i].key;
    rebuild();
  });

  const orbit = panelOrbit(ctx, panels.map((p) => p.group), { yaw: 0.42, pitch: 0.28 });
  return {
    tick: () => {
      spreadPanels(camera, panels.map((p) => p.group));
      orbit();
    },
  };
});
