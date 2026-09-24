// How a laser scanner acquires 3D: by timing a pulse, one direction at a time.
//
// Played back from tools/acq/sim_rangescan.py. The mirror steps through a grid
// of directions; for each one the simulation marches the pulse until it meets
// something and records the distance. That grid of distances is panel 2 - a
// range image, one distance per direction, not a picture. Turn each distance
// back into a position and you have panel 3, which is the dataset.
//
// Distance is measured rather than inferred, so this works on surfaces with no
// texture at all, where photogrammetry gives up, and it arrives in real units
// without putting a ruler in the scene.
//
// The shadow is the thing to take away, and it is traced properly: the pulse
// stops at the first thing it meets, so the floor behind the specimen has no
// points and the range image has a black region where nothing came back. That
// is why a survey is several scan positions registered together, and why
// occlusion gets planned before anybody presses a button.
//
// Keeping only the first return is also what separates this from the echo
// methods. A laser scanner gets a surface; sonar and seismics keep the whole
// returning waveform and get a volume.

import { defineScene, THREE, palette } from '../runtime.js';
import { replay, makePoints, specimen, spinnable } from '../acquisition.js';
import * as shape from '../shape.js';
import { makeEye } from '../eye.js';

defineScene('acq-rangescan', (ctx) => {
  replay(ctx, 'rangescan', {
    film: { width: 2.9, pixels: 240 },
    start: 26,
    scale: [0.5, 1, 0.92],

    setup(panels, camera, data) {
      const [rig, , cloud] = panels;
      const m = data.manifest;

      // --- 1. the scene being scanned --------------------------------------
      // Turned so the view is roughly over the scanner's shoulder. Not all
      // the way down the beam - from exactly there nothing is occluded and
      // the shadow, which is the whole point, would be invisible.
      rig.rotation.y = 0.45;
      rig.add(specimen(shape, { detail: 40 }));

      const disc = new THREE.CircleGeometry(m.floorRadius, 56);
      const floor = new THREE.Mesh(disc,
        new THREE.MeshBasicMaterial({ color: '#eef1f6' }));
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = m.floor;
      rig.add(floor);

      // The head, drawn as the beam column it is aiming right now rather
      // than as the whole field it will eventually cover: narrow across,
      // the full fan tall. A real scanner does not illuminate the box all
      // at once - it turns, one column at a time - so a frustum that sat
      // still over the whole fan was showing the wrong thing. `update`
      // swings it to the column the sweep has reached.
      const eye = makeEye({
        color: palette.accent, reach: 0.8, spread: 0.075,
        aspect: (m.fan[1] / 2) / (0.075 * 0.8), label: null,
      });
      eye.group.position.set(...m.origin);
      rig.add(eye.group);

      const beams = new THREE.Group();
      rig.add(beams);

      // Where the pulses in this column came back from. A range scan is a
      // set of surface hits, and seeing them appear is the whole mechanism.
      const marks = new THREE.Group();
      rig.add(marks);

      // --- 3. the points ---------------------------------------------------
      const points = makePoints(cloud, data.points, { size: 0.042 });
      const hitGeo = new THREE.SphereGeometry(0.055, 10, 8);
      const hitMat = new THREE.MeshBasicMaterial({ color: palette.accent });
      spinnable(ctx, cloud);
      const ghost = new THREE.Mesh(disc, new THREE.MeshBasicMaterial({
        color: '#f3f5f8', transparent: true, opacity: 0.5,
      }));
      ghost.rotation.x = -Math.PI / 2;
      ghost.position.y = m.floor - 0.01;
      cloud.add(ghost);

      return { beams, marks, points, hitGeo, hitMat, m, eye };
    },

    update(step, st, data) {
      const { origin, fwd, right, up, fan, rows } = st.m;
      const o = new THREE.Vector3(...origin);
      const f = new THREE.Vector3(...fwd);
      const r = new THREE.Vector3(...right);
      const u = new THREE.Vector3(...up);

      // The column of beams the mirror is on right now, drawn two ways:
      // out to where the pulse actually stopped, and - for the directions
      // nothing came back from - off into the distance.
      st.beams.clear();
      const cols = data.manifest.steps;
      const uu = (step / (cols - 1) - 0.5) * fan[0];

      // Swing the head onto this column. The target is a point one unit
      // down the column's centre line, in the rig's coordinates - which is
      // what setTarget wants, the glyph being a child of the rig.
      st.eye.setTarget(o.clone().add(f.clone().addScaledVector(r, uu)));

      const { pos, upTo } = data.points;
      const hits = [];
      for (let i = step > 0 ? upTo[step - 1] : 0; i < upTo[step]; i++) {
        hits.push(o.clone(),
          new THREE.Vector3(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]));
      }
      st.beams.add(new THREE.LineSegments(
        new THREE.BufferGeometry().setFromPoints(hits),
        new THREE.LineBasicMaterial({
          color: palette.accent, transparent: true, opacity: 0.3,
        }),
      ));

      // A bright mark at every return in this column: one pulse, one
      // distance, one point.
      st.marks.clear();
      const landed = (upTo[step] - (step > 0 ? upTo[step - 1] : 0));
      if (landed > 0) {
        const dots = new THREE.InstancedMesh(st.hitGeo, st.hitMat, landed);
        const mm = new THREE.Matrix4();
        let n = 0;
        for (let i = step > 0 ? upTo[step - 1] : 0; i < upTo[step]; i++) {
          mm.makeTranslation(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
          dots.setMatrixAt(n++, mm);
        }
        dots.instanceMatrix.needsUpdate = true;
        st.marks.add(dots);
      }

      const missed = [];
      for (let i = 0; i < rows; i += 6) {
        const vv = (i / (rows - 1) - 0.5) * fan[1];
        const dir = f.clone().addScaledVector(r, uu).addScaledVector(u, vv)
          .normalize();
        missed.push(o.clone(), o.clone().addScaledVector(dir, 3.2));
      }
      st.beams.add(new THREE.LineSegments(
        new THREE.BufferGeometry().setFromPoints(missed),
        new THREE.LineBasicMaterial({
          color: palette.grey, transparent: true, opacity: 0.16,
        }),
      ));

      st.points.reveal(step);
    },
  });
});
