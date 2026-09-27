// The one-voxel border, and why a mesh arrives with a hole in it.
//
// Isosurface extraction only puts a surface where the threshold is *crossed*.
// Where the specimen runs off the edge of the volume nothing crosses - the
// data simply stops - so the surface stops with it and the mesh is open there.
//
// The slide can assert that. What it cannot do is show that padding is not a
// repair: the cap it adds is flat, and it sits exactly where the field of view
// ended rather than where the specimen did. Both halves of that are visible
// here in one drag.
//
// The open-edge count is the point of the readout. It is the same check the
// notebook runs after extraction - an edge used by one triangle instead of two
// - and it turns "looks closed" into a number that is either zero or not.

import { defineScene, THREE, palette } from '../runtime.js';
import * as shape from '../shape.js';
import { extract } from '../isosurface.js';

const RES = 56;          // samples across the full specimen, before cropping
const LEVEL = 0.5;
const PAD = 2;           // voxels of background added on every face

/**
 * Edges used by exactly one triangle.
 *
 * A closed surface has none. Keyed on the vertex pair rather than on position,
 * which is what we want here: `extract` already shares a vertex between the
 * cells that meet at it, so two triangles that quote the same pair really are
 * neighbours.
 */
function openEdges(geometry) {
  const index = geometry.getIndex();
  if (!index) return 0;
  const seen = new Map();
  const bump = (a, b) => {
    const key = a < b ? `${a},${b}` : `${b},${a}`;
    seen.set(key, (seen.get(key) ?? 0) + 1);
  };
  for (let i = 0; i < index.count; i += 3) {
    const a = index.getX(i);
    const b = index.getX(i + 1);
    const c = index.getX(i + 2);
    bump(a, b); bump(b, c); bump(c, a);
  }
  let open = 0;
  for (const count of seen.values()) if (count === 1) open++;
  return open;
}

defineScene('iso-padding', ({ scene, ui, view }) => {
  view(2.0, 1.9, 2.6, 1.28);

  let crop = 0.60;         // share of the specimen's own bounds kept
  let padded = false;

  const surface = new THREE.Mesh(undefined, new THREE.MeshPhysicalMaterial({
    color: palette.roseLight, roughness: 0.4, metalness: 0.02,
    clearcoat: 0.5, side: THREE.FrontSide, flatShading: false,
  }));
  scene.add(surface);

  // The inside of the surface, in a colour it never has when it is closed.
  //
  // Without this the scene does not work at all. The holes are flat cuts in
  // the plane of the box, seen from outside, so a single-sided surface just
  // looks slightly short and a double-sided one looks correct. Painting the
  // backfaces dark means any glimpse of dark IS a hole, at any angle, and
  // the padding toggle makes it vanish.
  const interior = new THREE.Mesh(undefined, new THREE.MeshStandardMaterial({
    color: palette.roseDeep, roughness: 0.85, metalness: 0,
    side: THREE.BackSide, flatShading: false,
  }));
  scene.add(interior);

  // The box the data covers. Without it the hole reads as a modelling mistake
  // rather than as the edge of the acquisition.
  const box = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
    new THREE.LineBasicMaterial({ color: palette.grey, transparent: true, opacity: 0.55 }),
  );
  scene.add(box);

  const report = ui.readout('Open edges');
  const say = ui.note();

  function rebuild() {
    surface.geometry?.dispose();

    // The field of view: the specimen's bounds, scaled down by `crop`.
    const fov = {
      x: shape.BOUNDS.x * crop,
      y: shape.BOUNDS.y * crop,
      z: shape.BOUNDS.z * crop,
    };
    const step = (2 * fov.x) / RES;
    const grow = padded ? PAD * step : 0;

    const bounds = { x: fov.x + grow, y: fov.y + grow, z: fov.z + grow };
    const res = RES + (padded ? 2 * PAD : 0);

    // An occupancy mask rather than shape.sampleVolume, because padding is
    // something you do to a mask. The intensity field runs from 0.22 at the
    // petal edges, so a threshold at 0.5 keeps only the dense core - which
    // makes a tidy picture and cuts almost nothing at the box.
    //
    // Outside the field of view there is no data, so it reads as background.
    // That is what padding actually does; it does not recover the specimen.
    const sample = (x, y, z) => (
      Math.abs(x) <= fov.x && Math.abs(y) <= fov.y && Math.abs(z) <= fov.z
        && shape.isInside(x, y, z) ? 1 : 0
    );

    const out = extract({ sample, bounds, level: LEVEL, res });
    surface.geometry = out.geometry;
    interior.geometry = out.geometry;

    box.scale.set(fov.x * 2, fov.y * 2, fov.z * 2);

    const open = openEdges(out.geometry);
    report(open === 0 ? '0 - closed' : open.toLocaleString('en'));
    say(open === 0
      ? 'Closed: every edge has two triangles. Volume is defined, and it will slice.'
      : `${open.toLocaleString('en')} edges have one triangle. The mesh has no inside.`);
  }

  ui.slider('Field of view', {
    min: 0.45, max: 1.15, step: 0.01, value: crop,
    format: (v) => (v >= 1 ? 'whole specimen' : `${Math.round(v * 100)}% - cropped`),
  }, (v) => { crop = v; rebuild(); });

  ui.toggle('Pad with background', false, (on) => { padded = on; rebuild(); });
});
