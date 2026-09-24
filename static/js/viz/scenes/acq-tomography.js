// Tomography never measures a volume. It measures projections.
//
// Turn the specimen, record what the detector sees, turn again - a few
// hundred times - and reconstruct the volume from the set afterwards. The
// beam here is parallel and the axis vertical, so every detector row
// reconstructs its own slice and the result is the whole volume rather than
// a slab through the middle.
//
// Deliberately abstract about the instrument. The contrast can be
// absorption, phase, fluorescence or diffraction; what makes it tomography
// is the rotation and the reconstruction, and those are the same either way.
//
// Panel 3 is filtered back-projection throughout. The filter is not an
// option - smearing projections back counts the low frequencies over and
// over, and the ramp is the correction for that - so there is nothing to
// switch here. What few angles give you is streaks, which is what the first
// part of the slider shows. Either way the volume is computed, so its
// artefacts belong to the arithmetic rather than to the specimen.

import { defineScene, THREE, palette } from '../runtime.js';
import {
  MEASURED_STYLE, replay, specimen, spinnable, volumeFrame,
} from '../acquisition.js';
import { makeVolume } from '../volume.js';
import * as shape from '../shape.js';

const B = [1.25, 0.98, 1.25];

defineScene('acq-tomography', (ctx) => {
  replay(ctx, 'tomography', {
    start: 7,
    scale: 0.72,
    field: 2.84,

    setup(panels, camera, data) {
      const [rig, , recon] = panels;
      const [dw, dh] = data.manifest.detector;

      // --- 1. the beam and the detector ---------------------------------
      const spin = new THREE.Group();
      rig.add(spin);

      // A parallel beam: a slab of rays, all the same direction, as wide and
      // as tall as the detector. Not a point source with a fan - that is a
      // different geometry and would reconstruct differently.
      for (let i = 0; i < 11; i++) {
        const u = (i / 10 - 0.5) * dw;
        spin.add(new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(u, 0, 1.85), new THREE.Vector3(u, 0, -1.85),
          ]),
          new THREE.LineBasicMaterial({
            color: palette.amber, transparent: true, opacity: 0.42,
          }),
        ));
      }

      const window_ = new THREE.Mesh(
        new THREE.PlaneGeometry(dw, dh),
        new THREE.MeshBasicMaterial({
          color: palette.amber, transparent: true, opacity: 0.09,
          side: THREE.DoubleSide, depthWrite: false,
        }),
      );
      window_.position.z = 1.85;
      spin.add(window_);

      const detector = new THREE.Mesh(
        new THREE.PlaneGeometry(dw, dh),
        new THREE.MeshStandardMaterial({
          color: palette.iceDeep, roughness: 0.7, side: THREE.DoubleSide,
          // See-through, because the gantry swings it between the viewer and
          // the specimen half the time.
          transparent: true, opacity: 0.34, depthWrite: false,
        }),
      );
      detector.position.z = -1.85;
      spin.add(detector);

      // The specimen stays still and the gantry turns around it. At a
      // beamline it is usually the other way round - the sample sits on the
      // rotation stage - but the relative motion is the same, and so is the
      // data.
      rig.add(specimen(shape, { detail: 36 }));

      const trail = new THREE.Group();
      rig.add(trail);

      // --- 3. the reconstruction ------------------------------------------
      const spun = new THREE.Group();
      recon.add(spun);
      const volume = makeVolume(spun, {
        shape: data.shape, bounds: B, ...MEASURED_STYLE,
        threshold: 0.07, width: 0.06, density: 0.13,
      });
      volumeFrame(spun, B);
      spinnable(ctx, spun);

      return { spin, trail, volume };
    },

    update(step, st, data) {
      st.spin.rotation.y = data.manifest.geometry.angle[step];

      // Angles already recorded, as a ring of marks.
      st.trail.clear();
      const marks = new THREE.InstancedMesh(
        new THREE.SphereGeometry(0.035, 8, 6),
        new THREE.MeshBasicMaterial({ color: '#b9bec8' }),
        step + 1,
      );
      const mm = new THREE.Matrix4();
      for (let i = 0; i <= step; i++) {
        const a = data.manifest.geometry.angle[i];
        mm.makeTranslation(Math.sin(a) * 1.85, 0, Math.cos(a) * 1.85);
        marks.setMatrixAt(i, mm);
      }
      marks.instanceMatrix.needsUpdate = true;
      st.trail.add(marks);

      st.volume.update(data.series[step]);
    },
  });
});
