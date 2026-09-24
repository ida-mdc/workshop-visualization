// How simulation produces data: by choosing a grid and stepping a solver.
//
// Nothing here is measured. A domain is cut into cells, the equations are
// solved at every cell, and the solver advances in time (1). What it writes
// out at each step is a field on that grid - here the slice through the middle
// of it (2) - and the dataset is the field over the whole domain, on cells
// that are refined wherever the solution changes fast (3).
//
// Two consequences for anyone visualising the output. The grid is a decision,
// often adaptive or unstructured, so a viewer that only handles uniform
// arrays will not open it. And there is no noise anywhere: if the output looks
// noisy, that is a numerical problem worth chasing rather than something to
// filter away.

import { defineScene, THREE, ramp } from '../runtime.js';
import { triptych, makeFilm } from '../acquisition.js';
import { extract } from '../isosurface.js';

const EXTENT = 2.05;
const STEPS = 30;
const FIELD = ['#3b7fa8', '#6fc0d4', '#f0bf62', '#e1462c'];

/** A plume rising through the domain, at solver time `t` in 0..1. */
function value(x, y, z, t) {
  const top = -0.85 + t * 1.5;                    // how far the front has risen
  const head = Math.exp(-((x * x + (y - top) ** 2 + z * z) / 0.17));
  const rise = 1 / (1 + Math.exp((y - top) * 8));
  const stem = Math.exp(-((x * x + z * z) / 0.05)) * rise
    * (y > -0.95 ? 1 : 0);
  return Math.min(1, 0.95 * head + 0.8 * stem);
}

/** How fast it changes here - what an adaptive mesh refines on. */
function varies(x, y, z, h, t) {
  return Math.abs(value(x + h, y, z, t) - value(x - h, y, z, t))
    + Math.abs(value(x, y + h, z, t) - value(x, y - h, z, t))
    + Math.abs(value(x, y, z + h, t) - value(x, y, z - h, t));
}

defineScene('acq-simulation', (ctx) => {
  triptych(ctx, {
    labels: ['the solver', 'this timestep', 'the field on its grid'],
    steps: STEPS,
    start: 14,

    setup(panels, camera) {
      const [domain, film, grid] = panels;
      // Both boxes are a full bounds cube, which is the tallest thing any
      // of these panels holds; the layout gives it about this much room.
      domain.scale.setScalar(0.74);
      grid.scale.setScalar(0.74);

      // --- 1. the domain and its boundary ----------------------------------
      domain.add(new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(EXTENT, EXTENT, EXTENT)),
        new THREE.LineBasicMaterial({ color: '#9aa7b4' }),
      ));
      const plume = new THREE.Group();
      domain.add(plume);
      // The inlet: where the solver is pushing material in.
      const inlet = new THREE.Mesh(
        new THREE.CircleGeometry(0.22, 32),
        new THREE.MeshBasicMaterial({ color: '#e1462c', transparent: true,
          opacity: 0.45 }),
      );
      inlet.rotation.x = -Math.PI / 2;
      inlet.position.y = -EXTENT / 2 + 0.01;
      domain.add(inlet);

      // --- 2. the slice this step wrote out --------------------------------
      const sheet = makeFilm({ camera, pixels: 120 });
      film.add(sheet.group);

      // --- 3. the adaptive grid --------------------------------------------
      const cells = new THREE.Group();
      grid.add(cells);
      grid.add(new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(EXTENT, EXTENT, EXTENT)),
        new THREE.LineBasicMaterial({
          color: '#9aa7b4', transparent: true, opacity: 0.4,
        }),
      ));

      return { plume, sheet, cells };
    },

    update(s, st) {
      const t = s / (STEPS - 1);

      // --- 1. the front the solver has computed, as a surface --------------
      // A real isosurface of the field, so this panel shows the *physics* and
      // panel 3 shows the grid it was computed on - otherwise the two panels
      // are the same picture twice.
      st.plume.clear();
      const iso = extract({
        sample: (x, y, z) => value(x, y, z, t),
        bounds: { x: EXTENT / 2, y: EXTENT / 2, z: EXTENT / 2 },
        level: 0.3,
        res: 26,
      });
      st.plume.add(new THREE.Mesh(iso.geometry, new THREE.MeshPhysicalMaterial({
        color: '#e07a4a', roughness: 0.35, clearcoat: 0.4,
        side: THREE.DoubleSide,
      })));

      // --- 2. the slice the solver wrote at this step ----------------------
      const { ctx: g, canvas } = st.sheet;
      const img = g.createImageData(canvas.width, canvas.height);
      for (let py = 0; py < canvas.height; py++) {
        const y = EXTENT / 2 - ((py + 0.5) / canvas.height) * EXTENT;
        for (let px = 0; px < canvas.width; px++) {
          const x = -EXTENT / 2 + ((px + 0.5) / canvas.width) * EXTENT;
          const v = value(x, y, 0, t);
          const c = ramp(FIELD, v ** 0.6);
          const o = (py * canvas.width + px) * 4;
          // Dark where there is nothing, so the field reads as a field.
          const k = v < 0.04 ? 0.12 : 1;
          img.data[o] = c.r * 255 * k;
          img.data[o + 1] = c.g * 255 * k;
          img.data[o + 2] = c.b * 255 * k;
          img.data[o + 3] = 255;
        }
      }
      g.putImageData(img, 0, 0);
      st.sheet.commit();

      // --- 3. the adaptive grid at this step -------------------------------
      st.cells.clear();
      const m = new THREE.Matrix4();
      const out = [];
      const base = 4;
      const size = EXTENT / base;
      const subdivide = (cx, cy, cz, sz, level) => {
        const h = sz * 0.5;
        if (level < 2 && varies(cx, cy, cz, h, t) > 0.08) {
          const q = sz * 0.25;
          for (const dx of [-q, q]) {
            for (const dy of [-q, q]) {
              for (const dz of [-q, q]) {
                subdivide(cx + dx, cy + dy, cz + dz, sz * 0.5, level + 1);
              }
            }
          }
          return;
        }
        out.push({ cx, cy, cz, sz, v: value(cx, cy, cz, t) });
      };
      for (let i = 0; i < base; i++) {
        for (let j = 0; j < base; j++) {
          for (let k = 0; k < base; k++) {
            subdivide(-EXTENT / 2 + (i + 0.5) * size,
              -EXTENT / 2 + (j + 0.5) * size,
              -EXTENT / 2 + (k + 0.5) * size, size, 0);
          }
        }
      }

      const bySize = new Map();
      for (const c of out) {
        if (c.v <= 0.06) continue;
        const key = c.sz.toFixed(4);
        if (!bySize.has(key)) bySize.set(key, []);
        bySize.get(key).push(c);
      }
      for (const [key, list] of bySize) {
        const sz = parseFloat(key);
        const mesh = new THREE.InstancedMesh(
          new THREE.BoxGeometry(sz * 0.88, sz * 0.88, sz * 0.88),
          new THREE.MeshStandardMaterial({ roughness: 0.45 }),
          list.length,
        );
        list.forEach((c, i) => {
          m.makeTranslation(c.cx, c.cy, c.cz);
          mesh.setMatrixAt(i, m);
          mesh.setColorAt(i, ramp(FIELD, c.v ** 0.6));
        });
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        st.cells.add(mesh);
      }
      // Cells with no solution in them, as wire: the domain is still full.
      const wire = new THREE.Group();
      for (const c of out) {
        if (c.v > 0.06) continue;
        const l = new THREE.LineSegments(
          new THREE.EdgesGeometry(new THREE.BoxGeometry(c.sz, c.sz, c.sz)),
          new THREE.LineBasicMaterial({
            color: '#ccd1d9', transparent: true, opacity: 0.18,
          }),
        );
        l.position.set(c.cx, c.cy, c.cz);
        wire.add(l);
      }
      st.cells.add(wire);

    },
  });

});
