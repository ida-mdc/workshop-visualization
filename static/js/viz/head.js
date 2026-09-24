// The T1 head, fetched once and shared by every scene that wants it.
//
// A real dataset, next to the procedural flower: noisy, with soft tissue that
// shades into the background instead of stopping at it. Most of what the
// voxels session has to say about thresholds only becomes obvious on data
// like this, where there is no value that cleanly separates head from air.
//
// Produced by tools/make-head-volume.py from example_data/t1-head.tif. The
// shape is in the filename; SHAPE below has to match it.

import { THREE } from './runtime.js';

export const SHAPE = [128, 128, 112];

/**
 * Half-extents of the box, x anterior-posterior, y superior-inferior,
 * z left-right.
 *
 * Measured, not assumed. The TIFF carries no calibration, and a nominal
 * 1.5 mm slice spacing put the head's front-to-back extent at 143 mm against
 * 150 mm across - the wrong way round for a head, and it showed as a face
 * too wide by about a third. Taking the tissue extents out of the volume
 * (73 x 86 x 92 planes above background) and setting z so that
 * front-to-back : across comes out at the 190:150 a head actually has gives
 * the z below.
 */
export const BOUNDS = [0.5, 0.5, 0.274];

// Not named URL: that shadows the global URL constructor this line needs,
// and the temporal dead zone turns it into a ReferenceError at import time.
const DATA = new URL('../../data/t1-head-128x128x112.raw', import.meta.url);

let pending = null;

/**
 * The volume as a Data3DTexture, fetched at most once per page.
 *
 * Every scene awaits the same promise, so four panels of the same head cost
 * one request and one upload.
 */
export function loadHead() {
  pending ??= fetch(DATA)
    .then((r) => {
      if (!r.ok) throw new Error(`${DATA}: ${r.status}`);
      return r.arrayBuffer();
    })
    .then((buffer) => {
      const [nx, ny, nz] = SHAPE;
      const data = new Uint8Array(buffer);
      if (data.length !== nx * ny * nz) {
        throw new Error(`head volume is ${data.length} bytes, expected `
          + `${nx * ny * nz} - SHAPE and the file disagree`);
      }
      const texture = new THREE.Data3DTexture(data, nx, ny, nz);
      texture.format = THREE.RedFormat;
      texture.type = THREE.UnsignedByteType;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.unpackAlignment = 1;
      texture.needsUpdate = true;
      return texture;
    });
  return pending;
}
