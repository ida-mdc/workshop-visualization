// Voxels to a surface, and what the two knobs actually do.
//
// The specimen is the flower used throughout the data-types part of the
// deck, sampled the way an actual scan would be: a bright core-and-stem
// intensity inside, low-level sensor noise everywhere else - so it is not
// only the surface that responds to the two sliders here, the background
// does too. A real scan of a real specimen looks like this: the reason to
// know it is the same flower is that the effects below are properties of
// scanning it, not properties of a specimen built to show them off.
//
// Two things to land. The threshold is a choice - drag it low and flecks of
// background noise start crossing it too, drag it into the specimen's own
// range and those disappear while the core stays solid, and nothing in the
// data marks which value is "right". Voxel size sets the staircase, the
// triangle count and nothing else: the specimen is the same at every
// setting, so a surface that looks rough is a statement about your
// sampling, not about the flower.

import { defineScene, THREE, palette } from '../runtime.js';
import * as shape from '../shape.js';
import { extract } from '../isosurface.js';

defineScene('iso-extraction', ({ scene, ui, view }) => {
  view(1.5, 2.6, 2.1, 0.8);

  let level = 0.22;
  let res = 60;
  let wireframe = false;

  const surface = new THREE.Mesh(undefined, new THREE.MeshPhysicalMaterial({
    color: palette.ice, roughness: 0.22, metalness: 0.02,
    clearcoat: 0.8, clearcoatRoughness: 0.2,
    side: THREE.DoubleSide, flatShading: false,
  }));
  scene.add(surface);

  const wire = new THREE.LineSegments(undefined, new THREE.LineBasicMaterial({
    color: palette.iceDeep, transparent: true, opacity: 0.35,
  }));
  scene.add(wire);

  const report = ui.readout('Triangles');

  function rebuild() {
    surface.geometry?.dispose();
    wire.geometry?.dispose();

    const out = extract({
      sample: shape.sampleVolume,
      bounds: shape.BOUNDS,
      level,
      res,
    });
    surface.geometry = out.geometry;
    wire.geometry = wireframe
      ? new THREE.WireframeGeometry(out.geometry)
      : new THREE.BufferGeometry();
    wire.visible = wireframe;

    report(`${out.triangles.toLocaleString('en')} from `
      + `${out.grid.join('×')} samples`);
  }

  ui.slider('Threshold', {
    min: 0.08, max: 0.6, step: 0.01, value: level,
    format: (v) => v.toFixed(2),
  }, (v) => { level = v; rebuild(); });

  // The step size itself, not the count of cells it takes to cross the box -
  // "60 across" answers a question about the grid; "0.042 per voxel" answers
  // the one this slide is actually asking, which is how coarse each sample is.
  ui.slider('Voxel size', {
    min: 18, max: 96, step: 2, value: res,
    format: (v) => (2 * shape.BOUNDS.x / v).toFixed(3),
  }, (v) => { res = v; rebuild(); });

  ui.toggle('Wireframe', false, (on) => { wireframe = on; rebuild(); });
});
