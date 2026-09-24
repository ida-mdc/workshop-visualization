// A microscope builds a volume one slice at a time.
//
// Deliberately abstract: the slide does not say which microscope. Confocal,
// light-sheet, two-photon and serial sectioning all differ enormously in how
// the slice is chosen - with light, or with a knife - and produce the same
// shape of data, which is the only part that matters here.
//
// Panel 1 is the specimen with the slice currently being imaged lit up
// across it, and a few of the slices already taken behind it. Panel 2 is
// what the instrument records at that instant. Panel 3 is those images
// piled up, which is the dataset - the same numbers, so the grain in the
// image is in the volume too.
//
// The slice in panel 1 carries panel 2's own image, so the glow across the
// specimen is the measurement rather than a decoration.

import { defineScene, THREE, palette } from '../runtime.js';
import {
  EMITTED_STYLE, backdrop, replay, specimen, spinnable, volumeFrame,
} from '../acquisition.js';
import { makeVolume } from '../volume.js';
import * as shape from '../shape.js';

const B = [1.25, 0.98, 1.25];
const SHEETS = 7;          // how many past slices to draw, not all of them

defineScene('acq-microscopy', (ctx) => {
  replay(ctx, 'microscopy', {
    start: 14,
    scale: 0.76,
    field: 2 * B[0],
    rule: '#39424e',

    setup(panels, camera, data) {
      const [stage, , stack] = panels;
      // The whole plot is dark. What a microscope records is light the
      // specimen gave off, and on a white page the brightest parts of it -
      // the signal - vanish into the background.
      backdrop(ctx, camera);

      // --- 1. the specimen and the slice being imaged ---------------------
      const body = specimen(shape, { detail: 38 });
      body.material.roughness = 0.75;
      stage.add(body);

      // The slice lights the specimen up where it cuts through it. What is
      // drawn on the plane is the signal in this slice and nothing else -
      // transparent everywhere there is no specimen - so the plane never
      // becomes a card laid over the picture, it becomes a glowing
      // cross-section.
      const [nx, , nz] = data.shape;
      const glow = document.createElement('canvas');
      glow.width = nx;
      glow.height = nz;
      const glowCtx = glow.getContext('2d');
      const glowTex = new THREE.CanvasTexture(glow);
      glowTex.minFilter = THREE.LinearFilter;
      glowTex.magFilter = THREE.LinearFilter;

      const slice = new THREE.Mesh(
        new THREE.PlaneGeometry(2 * B[0], 2 * B[2]),
        new THREE.MeshBasicMaterial({
          map: glowTex, transparent: true, opacity: 0.95,
          side: THREE.DoubleSide, depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      slice.rotation.x = -Math.PI / 2;
      stage.add(slice);

      // A thin outline, so the plane is locatable even where it is dark.
      slice.add(new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.PlaneGeometry(2 * B[0], 2 * B[2])),
        new THREE.LineBasicMaterial({
          color: palette.amber, transparent: true, opacity: 0.55,
        }),
      ));

      // A few of the slices already taken. All twenty-six of them stack into
      // an opaque slab and hide the specimen; a handful reads as a stack.
      const done = new THREE.Group();
      stage.add(done);

      // --- 3. the stack ----------------------------------------------------
      const spun = new THREE.Group();
      stack.add(spun);
      const volume = makeVolume(spun, {
        shape: data.shape, bounds: B, ...EMITTED_STYLE,
        threshold: 0.345, width: 0.075, density: 0.30, curve: 2.6,
      });
      volumeFrame(spun, B, '#3d4855');
      spinnable(ctx, spun);

      return { slice, done, volume, glow, glowCtx, glowTex };
    },

    update(step, st, data) {
      const ys = data.manifest.geometry.y;
      const y = ys[step];
      st.slice.position.y = y;

      // The cross-section, straight from the slice the instrument recorded.
      // Below the threshold there is only background, and background should
      // not glow.
      const [nx, ny, nz] = data.shape;
      const img = st.glowCtx.createImageData(nx, nz);
      const THR = 0.42;
      for (let z = 0; z < nz; z++) {
        for (let x = 0; x < nx; x++) {
          const v = data.volume[x + nx * (step + ny * z)] / 255;
          const a = Math.min(1, Math.max(0, (v - THR) / (1 - THR)));
          const o = ((nz - 1 - z) * nx + x) * 4;
          img.data[o] = 255;
          img.data[o + 1] = 226;
          img.data[o + 2] = 168;
          img.data[o + 3] = Math.round(255 * a ** 0.55);
        }
      }
      st.glowCtx.putImageData(img, 0, 0);
      st.glowTex.needsUpdate = true;

      st.done.clear();
      const sheet = new THREE.PlaneGeometry(2 * B[0], 2 * B[2]);
      const mat = new THREE.MeshBasicMaterial({
        color: '#6f8ba3', transparent: true, opacity: 0.1,
        side: THREE.DoubleSide, depthWrite: false,
      });
      const every = Math.max(1, Math.ceil((step + 1) / SHEETS));
      for (let i = 0; i <= step; i += every) {
        const q = new THREE.Mesh(sheet, mat);
        q.rotation.x = -Math.PI / 2;
        q.position.y = ys[i];
        st.done.add(q);
      }

      st.volume.update(data.volume, { order: data.order, step });
      st.volume.glow(y, { width: 0.022, strength: 0.010, color: palette.amber });
    },
  });
});
