// How photogrammetry acquires 3D: from ordinary photographs, twice over.
//
// Played back from tools/acq/sim_photogrammetry.py. Panel 2 is the growing
// collection of photographs - the actual output of walking round with a
// camera, ray traced against the same specimen the other panels use, with a
// fixed surface texture. Fixed because it has to be: a feature can only be
// matched between two images if that patch of surface looks the same in both,
// which is the whole reason this fails on anything shiny, clear or plain.
//
// Panel 3 is what two algorithms make of that collection. Structure from
// motion recovers where each photograph was taken by matching features across
// several of them; multi-view stereo then triangulates each surface point
// from the images that can see it. So overlap is the game. A feature seen
// once contributes nothing; seen from three positions it has a location.
//
// Visibility in the simulation is traced rather than guessed, so petals
// genuinely hide each other and the cloud has the gaps that implies. And
// nothing here ever sees an interior - this is a surface method, full stop.

import { defineScene, THREE, palette } from '../runtime.js';
import { replay, makePoints, specimen, spinnable } from '../acquisition.js';
import * as shape from '../shape.js';
import { makeEye } from '../eye.js';

defineScene('acq-photogrammetry', (ctx) => {
  replay(ctx, 'photogrammetry', {
    start: 6,
    // The cloud is the specimen, drawn the same size as the specimen in
    // panel 1 - which is small next to the ring of cameras, as it should be.
    scale: [0.60, 1, 1.05],
    film: { width: 3.3, pixels: 330 },

    setup(panels, camera, data) {
      const [rig, , cloud] = panels;
      const eyes = data.manifest.geometry.eye;

      rig.add(specimen(shape, { detail: 44 }));

      const marks = eyes.map((p) => {
        const eye = makeEye({
          color: palette.teal, reach: 0.44, spread: 0.5, label: null,
        });
        eye.group.position.set(p[0], p[1], p[2]);
        eye.setTarget(new THREE.Vector3(0, 0, 0));
        rig.add(eye.group);
        return eye;
      });

      const points = makePoints(cloud, data.points, { size: 0.036 });
      spinnable(ctx, cloud);
      return { marks, points, eyes };
    },

    update(step, st, data) {
      st.marks.forEach((e, i) => { e.group.visible = i <= step; });

      st.points.reveal(step);
    },
  });
});
