// Voxels to a surface, and what the two knobs actually do.
//
// The specimen is a snowflake because its branches span a wide range of sizes:
// the fine ones disappear at low resolution while the trunk survives, which is
// what "resolution" means far better than a sphere getting blocky.
//
// Two things to land. The threshold is a choice - drag it and the crystal
// grows or dissolves, and nothing in the data marks the right value. The grid
// resolution sets the staircase, the vertex count and nothing else: the
// specimen is the same at every setting, so a surface that looks rough is a
// statement about your sampling, not about the crystal.

import { defineScene, THREE, palette } from '../runtime.js';
import * as snowflake from '../snowflake.js';
import { extract } from '../isosurface.js';

defineScene('iso-extraction', ({ scene, ui, view }) => {
  view(1.5, 2.6, 2.1, 1.16);

  let level = 0.42;
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
      sample: snowflake.sampleVolume,
      bounds: snowflake.BOUNDS,
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
    min: 0.12, max: 0.72, step: 0.01, value: level,
    format: (v) => v.toFixed(2),
  }, (v) => { level = v; rebuild(); });

  ui.slider('Grid resolution', {
    min: 18, max: 96, step: 2, value: res,
    format: (v) => `${v} across`,
  }, (v) => { res = v; rebuild(); });

  ui.toggle('Wireframe', false, (on) => { wireframe = on; rebuild(); });
});
