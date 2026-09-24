// Vector fields: a direction and a magnitude at every location.
//
// The field here is transport through the specimen - sap up the stem, through
// the receptacle, out along every petal - so it is the same object the other
// three scenes show, measured differently. A field floating in the same box
// but unrelated to the geometry would quietly undo the argument the whole
// section is making.
//
// Glyphs and streamlines are that one field, answering different questions.
// A glyph is local and honest: one arrow, one sample. Turn the density up and
// they become a hedge you cannot see through. A streamline traces where a
// particle would go, which reads instantly, but it is an integration - the
// curve between two samples is a claim the data never made.

import { defineScene, THREE, palette, ramp, clearGroup } from '../runtime.js';
import * as shape from '../shape.js';

const B = shape.BOUNDS;

defineScene('vector-field', ({ scene, ui, view }) => {
  view(...shape.DETAIL_VIEW, shape.DETAIL_RADIUS);

  // Cool where transport is slow, hot where it is fast: a sequential ramp
  // through three hues, so magnitude reads without a legend.
  const FIELD = [palette.teal, palette.amber, palette.accent];
  const speedColor = (s) => ramp(FIELD, Math.min(1, s / shape.MAX_SPEED));

  const glyphs = new THREE.Group();
  const lines = new THREE.Group();
  scene.add(glyphs, lines);

  // The specimen stays as a ghost. Without it the field is just arrows, and
  // the point is that the arrows follow something.
  const ghost = new THREE.Mesh(
    shape.geometry(28),
    new THREE.MeshStandardMaterial({
      color: 0xb9b9c4, roughness: 0.9, transparent: true, opacity: 0.17,
      depthWrite: false,
    }),
  );
  scene.add(ghost);

  let density = 9;
  const axis = (i, n, half) => -half + (i / (n - 1)) * 2 * half;

  function rebuildGlyphs() {
    clearGroup(glyphs);
    const v = new THREE.Vector3();
    const spacing = (2 * B.x) / (density - 1);
    for (let i = 0; i < density; i++) {
      for (let j = 0; j < density; j++) {
        for (let k = 0; k < density; k++) {
          const at = new THREE.Vector3(
            axis(i, density, B.x), axis(j, density, B.y), axis(k, density, B.z),
          );
          shape.flowAt(at.x, at.y, at.z, v);
          const speed = v.length();
          if (speed < shape.FLOW_FLOOR) continue;   // masked: no transport here
          // Length carries magnitude, scaled to the lattice spacing and with a
          // floor: turning the density up should crowd the picture without the
          // individual arrows becoming invisible, and a glyph short enough to
          // vanish would read as "no data" rather than "slow".
          const len = spacing * 0.9
            * Math.max(0.3, Math.min(1, speed / shape.MAX_SPEED));
          glyphs.add(new THREE.ArrowHelper(
            v.clone().normalize(), at, len,
            speedColor(speed).getHex(), len * 0.38, len * 0.24,
          ));
        }
      }
    }
  }

  function rebuildLines() {
    clearGroup(lines);
    const v = new THREE.Vector3();
    const p = new THREE.Vector3();
    const dt = 0.055;
    // Released at the foot of the stem, so a streamline traces the whole
    // journey: up the stem, through the receptacle, out into one petal.
    const src = shape.FLOW_SOURCE;
    const seeds = density * density;
    for (let s = 0; s < seeds; s++) {
      // A ring, so every seed is already off the stagnation axis and commits
      // to one petal instead of riding straight up the middle.
      const a = (s / seeds) * Math.PI * 2;
      const r = src.radius * (0.7 + 0.3 * ((s * 7) % 5) / 4);
      p.set(src.centre.x + Math.cos(a) * r, src.centre.y, src.centre.z + Math.sin(a) * r);

      const pts = [];
      const cols = [];
      for (let step = 0; step < 600; step++) {
        shape.flowAt(p.x, p.y, p.z, v);
        const speed = v.length();
        pts.push(p.x, p.y, p.z);
        const c = speedColor(speed);
        cols.push(c.r, c.g, c.b);
        // Stop where the field is masked out or where the box ends. A
        // streamline is only defined where there is data, and letting the
        // integrator coast on past it - here, straight up out of the petals
        // on nothing but the ambient drift - is the mistake this slide warns
        // about, drawn by the slide itself.
        if (speed < shape.FLOW_FLOOR) break;
        if (Math.abs(p.x) > B.x || Math.abs(p.y) > B.y || Math.abs(p.z) > B.z) break;
        p.addScaledVector(v, dt);      // forward Euler is plenty at this step
      }
      if (pts.length < 9) continue;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
      lines.add(new THREE.Line(
        geo, new THREE.LineBasicMaterial({ vertexColors: true }),
      ));
    }
  }

  let mode = 0;
  function apply() {
    glyphs.visible = mode === 0;
    lines.visible = mode === 1;
    if (mode === 0) rebuildGlyphs(); else rebuildLines();
  }

  ui.choice('Draw as', ['Glyphs', 'Streamlines'], (i) => { mode = i; apply(); });
  ui.toggle('Specimen', true, (on) => { ghost.visible = on; });

});
