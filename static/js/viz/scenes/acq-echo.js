// How echo methods acquire a volume: by keeping the whole waveform.
//
// Played back from tools/acq/sim_echo.py. Seismics, sonar, ultrasound and
// ground-penetrating radar are the same measurement as a laser scanner - send
// a pulse, time the return, call it a distance - and they produce something
// completely different, for one reason.
//
// A scanner keeps the FIRST return and discards the rest, so it measures a
// surface. An echo instrument records the whole returning waveform, so every
// reflector along the path leaves its own arrival in the same trace,
// including the ones underneath the first one. Panel 2 is that: the traces
// recorded so far, shot across and time down, which is a gather. Panel 3 is
// where those arrivals migrate to.
//
// So panel 3 has the two buried horizons under the specimen, not just the top
// of it. Compare that with the range scan, which has a shadow where this has
// layers.
//
// Two more honest details. What echoes is a *change* in material rather than
// material itself, so panel 3 shows boundaries. And migration is the same
// operation as tomographic back-projection - it fails the same way, smearing
// reflectors into arcs when the survey is too narrow or too sparse, which is
// exactly what the first few shots look like.

import { defineScene, THREE, palette } from '../runtime.js';
import {
  MEASURED_STYLE, replay, specimen, spinnable, volumeFrame,
} from '../acquisition.js';
import { makeVolume } from '../volume.js';
import * as shape from '../shape.js';

const B = [1.25, 0.98, 1.25];

defineScene('acq-echo', (ctx) => {
  replay(ctx, 'echo', {
    start: 55,
    scale: 0.72,
    film: { width: 2.1, pixels: 240 },

    setup(panels, camera, data) {
      const [rig, , recon] = panels;
      const m = data.manifest;

      // --- 1. the medium and the shot --------------------------------------

      rig.add(specimen(shape, { detail: 36 }));

      // The ground the specimen stands on - the same disc the laser scanner
      // uses, so the two slides compare directly. A scanner leaves a shadow
      // on it; this does not.
      const floor = new THREE.Mesh(
        new THREE.CircleGeometry(m.floorRadius, 56),
        new THREE.MeshBasicMaterial({ color: '#e8ecf2' }),
      );
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = m.floor;
      rig.add(floor);

      // A transducer head pointing down, rather than a floating ball: it
      // should be obvious which way the pulse goes and what emitted it.
      const source = new THREE.Group();
      source.add(new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.17, 0.17, 20),
        new THREE.MeshStandardMaterial({
          color: '#8e99a6', roughness: 0.35, metalness: 0.6,
        }),
      ));
      const face = new THREE.Mesh(
        new THREE.CircleGeometry(0.17, 20),
        new THREE.MeshBasicMaterial({
          color: palette.accent, side: THREE.DoubleSide,
        }),
      );
      face.rotation.x = Math.PI / 2;
      face.position.y = -0.086;
      source.add(face);
      rig.add(source);

      const shots = new THREE.Group();
      rig.add(shots);

      // The pulse going down, as an expanding hemisphere. Its radius is the
      // travel time, which is the only thing the instrument measures.
      const front = new THREE.Group();
      for (let i = 1; i <= 3; i++) {
        front.add(new THREE.Mesh(
          new THREE.SphereGeometry(i / 3, 30, 12, 0, Math.PI * 2,
            Math.PI / 2, Math.PI / 2),
          new THREE.MeshBasicMaterial({
            color: palette.accent, transparent: true, opacity: 0.26 / i,
            side: THREE.DoubleSide, depthWrite: false,
          }),
        ));
      }
      rig.add(front);

      // --- 3. the migrated volume ------------------------------------------
      const spun = new THREE.Group();
      recon.add(spun);
      const volume = makeVolume(spun, {
        shape: data.shape, bounds: B, ...MEASURED_STYLE, threshold: 0.50,
      });
      volumeFrame(spun, B);

      // No ground truth overlaid. Panel 3 is what the method recovered, and
      // putting the answer next to it turns the panel into a scorecard
      // rather than a result - the horizons come back crisp and the
      // specimen comes back as a blob, which is a thing to say rather than
      // a thing to draw.
      spinnable(ctx, spun);

      return { source, shots, front, volume, m };
    },

    update(step, st, data) {
      const all = data.manifest.geometry.shot;
      const p = all[step];
      st.source.position.set(p[0], p[1], p[2]);
      st.front.position.set(p[0], p[1], p[2]);
      // Pulsing with the step so the picture reads as "a shot just fired".
      st.front.scale.setScalar(0.55 + 0.45 * ((step % 3) / 2));

      st.shots.clear();
      const marks = new THREE.InstancedMesh(
        new THREE.SphereGeometry(0.035, 8, 6),
        new THREE.MeshBasicMaterial({ color: '#b9bec8' }),
        step + 1,
      );
      const mm = new THREE.Matrix4();
      for (let i = 0; i <= step; i++) {
        mm.makeTranslation(all[i][0], all[i][1], all[i][2]);
        marks.setMatrixAt(i, mm);
      }
      marks.instanceMatrix.needsUpdate = true;
      st.shots.add(marks);

      st.volume.update(data.series[step]);
    },
  });
});
