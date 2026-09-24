// Loads the simulated acquisitions.
//
// The three panels of an acquisition scene must not be able to disagree with
// each other, so none of them is computed here. Each modality is simulated
// once in tools/acq/*.py - the instrument geometry, the frames it recorded,
// and the dataset those frames assemble into, all from the same loop over the
// same specimen - and written to static/data/acq/<name>/. This module reads
// that back and the scenes replay it.
//
// The formats are deliberately boring. Images are PNG atlases, one tile per
// step, because PNG is lossless, compresses well and every static host serves
// it correctly. Point sets are a flat binary of 12-byte records. The manifest
// says how to read both.

const BASE = new URL('../../data/acq/', import.meta.url);

const cache = new Map();

async function pixels(url) {
  const img = new Image();
  img.src = url;
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const g = canvas.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  return {
    image: img,
    data: g.getImageData(0, 0, canvas.width, canvas.height).data,
    width: canvas.width,
    height: canvas.height,
  };
}

/**
 * Pull one volume out of a slice atlas.
 *
 * Tiles are z-slices laid out left to right, top to bottom. For a series the
 * volumes follow each other, each starting on a fresh atlas row.
 *
 * The result is laid out x fastest, then y, then z - which is what a
 * Data3DTexture wants, so panel 3 can hand it straight to the GPU.
 */
function readVolume(sheet, spec, index = 0) {
  const [nx, ny, nz] = spec.shape;
  const per = spec.tilesPerVolume || nz;
  const out = new Uint8Array(nx * ny * nz);
  for (let k = 0; k < nz; k++) {
    const tile = index * per + k;
    const col = tile % spec.cols;
    const row = (tile - col) / spec.cols;
    const ox = col * nx;
    const oy = row * ny;
    for (let y = 0; y < ny; y++) {
      let src = ((oy + y) * sheet.width + ox) * 4;
      for (let x = 0; x < nx; x++, src += 4) {
        out[x + nx * (y + ny * k)] = sheet.data[src];
      }
    }
  }
  return out;
}

/**
 * Points, sorted by the step they were acquired in.
 *
 * Sorting here means showing the cloud as it stood at step N is a draw range
 * rather than a rebuild, so dragging the slider costs nothing.
 */
function readPoints(buffer, spec) {
  const n = spec.count;
  const view = new DataView(buffer);
  const [bx, by, bz] = spec.bounds;

  const order = new Uint32Array(n);
  const when = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    order[i] = i;
    when[i] = view.getUint8(i * spec.stride + 9);
  }
  const sorted = Array.from(order).sort((a, b) => when[a] - when[b]);

  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const step = new Uint8Array(n);
  // How many points exist by the end of each step, for setDrawRange.
  const upTo = new Uint32Array(256);
  for (let k = 0; k < n; k++) {
    const o = sorted[k] * spec.stride;
    pos[k * 3] = (view.getInt16(o, true) / 32767) * bx;
    pos[k * 3 + 1] = (view.getInt16(o + 2, true) / 32767) * by;
    pos[k * 3 + 2] = (view.getInt16(o + 4, true) / 32767) * bz;
    col[k * 3] = view.getUint8(o + 6) / 255;
    col[k * 3 + 1] = view.getUint8(o + 7) / 255;
    col[k * 3 + 2] = view.getUint8(o + 8) / 255;
    step[k] = when[sorted[k]];
  }
  for (let s = 0, k = 0; s < 256; s++) {
    while (k < n && step[k] <= s) k++;
    upTo[s] = k;
  }
  return { count: n, pos, col, step, upTo };
}

/**
 * Load one modality. Returns the manifest plus whatever panel 3 needs.
 *
 * `frames` is the raw atlas image; draw a tile of it with `drawFrame` rather
 * than touching pixels, which keeps stepping the slider cheap.
 */
export async function load(name) {
  if (cache.has(name)) return cache.get(name);
  const promise = (async () => {
    const dir = new URL(`${name}/`, BASE);
    const manifest = await fetch(new URL('manifest.json', dir))
      .then((r) => r.json());

    const out = { manifest, name };
    if (manifest.frames) {
      out.frames = await pixels(new URL(manifest.frames.file, dir));
    }

    const p3 = manifest.panel3 || {};
    if (p3.kind === 'volume' || p3.kind === 'volume-series') {
      const sheet = await pixels(new URL(p3.file, dir));
      out.shape = p3.shape;
      if (p3.kind === 'volume') {
        out.volume = readVolume(sheet, p3);
        if (p3.order) {
          out.order = readVolume(await pixels(new URL(p3.order, dir)), p3);
        }
      } else {
        out.series = [];
        for (let i = 0; i < manifest.steps; i++) {
          out.series.push(readVolume(sheet, p3, i));
        }
      }
      if (p3.variants) {
        out.variants = {};
        for (const [label, file] of Object.entries(p3.variants)) {
          const alt = await pixels(new URL(file, dir));
          out.variants[label] = p3.kind === 'volume'
            ? readVolume(alt, p3)
            : Array.from({ length: manifest.steps },
              (_, i) => readVolume(alt, p3, i));
        }
      }
    } else if (p3.kind === 'field-series') {
      const sheet = await pixels(new URL(p3.file, dir));
      const [tw, th] = p3.tile;
      out.fields = [];
      for (let i = 0; i < manifest.steps; i++) {
        const col = i % p3.cols;
        const row = (i - col) / p3.cols;
        const f = new Float32Array(tw * th);
        for (let y = 0; y < th; y++) {
          let src = ((row * th + y) * sheet.width + col * tw) * 4;
          for (let x = 0; x < tw; x++, src += 4) {
            f[y * tw + x] = sheet.data[src] / 255;
          }
        }
        out.fields.push(f);
      }
      out.fieldSize = [tw, th];
    } else if (p3.kind === 'points') {
      const buf = await fetch(new URL(p3.file, dir))
        .then((r) => r.arrayBuffer());
      out.points = readPoints(buf, p3);
    }
    return out;
  })();
  cache.set(name, promise);
  return promise;
}

/** Draw the tile for `step` into a 2D context, filling it. */
export function drawFrame(data, step, g, w, h) {
  const spec = data.manifest.frames;
  const [tw, th] = spec.tile;
  const col = step % spec.cols;
  const row = (step - col) / spec.cols;
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, w, h);
  g.drawImage(data.frames.image, col * tw, row * th, tw, th, 0, 0, w, h);
}
