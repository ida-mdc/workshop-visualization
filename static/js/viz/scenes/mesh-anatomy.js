// Meshes: vertices, the edges between them, the faces they close.
//
// The resolution slider and the shading toggle are deliberately independent,
// because the trap is that they look like the same control. Smooth shading on
// a coarse mesh looks finer than it is: the silhouette still gives the real
// triangle count away, and any measurement you take is taken on the coarse
// geometry, not on the shading.

import { defineScene, THREE, palette } from '../runtime.js';
import * as shape from '../shape.js';

const LEVELS = [7, 12, 24, 56];

defineScene('mesh-anatomy', ({ scene, ui, view }) => {
  view(...shape.DETAIL_VIEW, shape.DETAIL_RADIUS);

  const surface = new THREE.Mesh(
    undefined,
    new THREE.MeshPhysicalMaterial({
      vertexColors: true, roughness: 0.45, clearcoat: 0.3, clearcoatRoughness: 0.5,
      // Nudge the filled faces away from the camera in the depth buffer so the
      // edges and vertices sitting exactly on them win. Without this the two
      // z-fight; with depth testing off instead, every vertex on the far side
      // of the object shows through and the picture is unreadable.
      polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
    }),
  );
  const wire = new THREE.LineSegments(
    undefined,
    new THREE.LineBasicMaterial({ color: palette.dark, transparent: true, opacity: 0.55 }),
  );
  const verts = new THREE.Points(
    undefined,
    new THREE.PointsMaterial({ color: palette.dark, size: 0.02 }),
  );
  scene.add(surface, wire, verts);

  const report = ui.readout('Triangles');
  let level = 2;

  function rebuild() {
    for (const obj of [surface, wire, verts]) obj.geometry?.dispose();

    const geo = shape.geometry(LEVELS[level]);
    surface.geometry = geo;
    // Shares the same geometry object, so the wireframe is guaranteed to be
    // the edges of the faces being drawn rather than a second approximation.
    wire.geometry = new THREE.WireframeGeometry(geo);
    verts.geometry = new THREE.BufferGeometry().setAttribute(
      'position', geo.attributes.position,
    );

    report((geo.index.count / 3).toLocaleString('en'));
  }

  ui.choice('Show', ['Vertices', '+ Edges', '+ Faces'], (i) => {
    verts.visible = true;
    wire.visible = i >= 1;
    surface.visible = i >= 2;
  }, 2);

  ui.slider('Resolution', {
    min: 0, max: LEVELS.length - 1, step: 1, value: level,
    format: (v) => ['coarse', 'low', 'medium', 'full'][v],
  }, (v) => { level = v; rebuild(); });


  ui.choice('Shading', ['Flat', 'Smooth'], (i) => {
    surface.material.flatShading = i === 0;
    surface.material.needsUpdate = true;
  }, 1);
});
