// The shared frame for the "how it is acquired" scenes.
//
// Every one of them tells the same three-part story, so they share a layout:
//
//   1  the instrument      what is physically happening
//   2  what it records     the raw output of that one moment - an image
//                          plane, a photograph, a projection, a range image
//   3  the dataset         everything recorded so far, assembled into one 3D
//                          thing
//
// And one control. Whatever moves during an acquisition - the stage, the
// gantry, the photographer, the mirror, the solver - moves with a single
// slider, and all three panels follow it. That is the point: the middle panel
// is what the instrument actually produced at this instant, and the right
// panel is what you end up with once it has been doing that for a while.
//
// Deliberately no other knobs. These scenes explain a process; anything you
// can tune is a distraction from following it.

import { THREE, palette, panelStrip } from './runtime.js';
import { load, drawFrame } from './acqdata.js';

// The layout has to match the shape of the box it lands in, or the fit
// leaves white space along whichever axis is slack.
//
// On a slide the box is about 1920 by 390 once the title and the two
// reference lines have taken their share - close to 5:1, not the 3:1 a
// triptych looks like it wants. So the layout is 11.7 by 2.4, the panels
// are a third of that apart, and the content is as large as the height
// allows rather than as large as a third of the width allows.
const SPACING = 3.9;
const PANEL_SCALE = 1.0;

/**
 * Lay out the three panels and wire up the time slider.
 *
 * `setup(panels)` populates them and returns whatever state it needs;
 * `update(step, state)` is called with the current step, 0..steps-1.
 */
export function triptych(ctx, {
  labels = ['the instrument', 'what it records', 'the dataset'],

  steps = 40,
  // Which step to open on. Zero is honest but often dull - the first sections
  // of a block are empty resin, the first angle of a scan reconstructs to
  // nothing - so a scene may open partway in.
  start = 0,
  frustum = [2.4, 11.7],
  // Panel captions and dividers, lightened for scenes drawn on a dark
  // backdrop.
  rule = '#dcdfe6',
  setup,
  update,
}) {
  const camera = ctx.projection('orthographic');
  ctx.frustum(frustum[0], frustum[1]);
  // Looking down on the panels at about thirty degrees rather than the eight
  // it used to be. From nearly level, a horizontal plane is almost edge-on:
  // the imaged plane is square and the volume is square in x and z, but both
  // foreshorten to a sixth of their depth and read as wide, shallow things
  // that do not match the square image in panel 2.
  ctx.view(0.85, 2.3, 3.9);
  ctx.controls.enabled = false;

  // Lay the panels out in the camera's frame, not the world's.
  //
  // The camera looks down on the scene from one side, so its up vector is
  // tilted and moving along world x moves a little way up the screen as
  // well as across it. Spacing the panels along world x therefore puts them
  // on a diagonal: panel 1 rides high, panel 3 sits low, and the three
  // captions stair-step. Placing them along the camera's own right and up
  // axes keeps them on one line however the view is angled.
  camera.updateMatrixWorld();
  const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
  const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
  const at = (across, down) => right.clone().multiplyScalar(across)
    .addScaledVector(up, down);

  // Which pass draws what.
  //
  //   flat   orthographic, whole box: panel 2, the dividers, any backdrop
  //   deep   perspective, left third: panel 1
  //   last   orthographic, right third: panel 3
  //
  // Panel 3 gets a pass of its own so that it can be zoomed. Scaling it up
  // inside the shared pass would let it spill across the other two; with
  // its own scissor it is clipped to its third, the way a zoomed viewport
  // should be.
  const flat = [];
  const deep = [];
  const last = [];

  panelStrip(ctx.el, labels);

  const panels = [-SPACING, 0, SPACING].map((x, i) => {
    const g = new THREE.Group();
    g.position.copy(at(x, 0));
    g.scale.setScalar(PANEL_SCALE);
    ctx.scene.add(g);

    ([deep, flat, last][i]).push(g);
    return g;
  });

  // A faint divider, so three panels read as three panels.
  for (const x of [-SPACING / 2, SPACING / 2]) {
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([at(x, -0.95), at(x, 1.1)]),
      new THREE.LineBasicMaterial({
        color: rule, transparent: true, opacity: 0.9,
      }),
    );
    line.position.addScaledVector(
      new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 2), -0.5);
    ctx.scene.add(line);
    flat.push(line);
  }

  // Panel 1 in perspective, panels 2 and 3 orthographic.
  //
  // The first panel is a picture of apparatus in a room and reads better
  // with a little convergence; the other two are a flat recorded image and
  // a measured box, where parallel projection is the honest choice and a
  // vanishing point would just be decoration. One camera cannot do both, so
  // the scene is drawn twice: once orthographically over the whole box with
  // panel 1 held back, then again in perspective over the left third with
  // only panel 1 showing.
  // Framed to match what the orthographic pass shows of a panel, so the
  // switch in projection does not also change the size of things.
  const near = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  const focus = at(-SPACING, 0);
  const away = camera.position.clone().normalize();
  near.position.copy(focus).addScaledVector(away, 4.81);
  near.up.copy(camera.up);
  near.lookAt(focus);

  const show = (list, on) => { for (const o of list) o.visible = on; };

  ctx.onDraw((renderer, rect) => {
    const third = Math.round(rect.width / 3);
    const autoClear = renderer.autoClear;

    show(deep, false);
    show(last, false);
    renderer.setViewport(rect.left, rect.bottom, rect.width, rect.height);
    renderer.setScissor(rect.left, rect.bottom, rect.width, rect.height);
    renderer.render(ctx.scene, camera);
    show(deep, true);

    show(flat, false);
    renderer.setViewport(rect.left, rect.bottom, third, rect.height);
    renderer.setScissor(rect.left, rect.bottom, third, rect.height);
    const aspect = third / rect.height;
    if (near.aspect !== aspect) {
      near.aspect = aspect;
      near.updateProjectionMatrix();
    }
    // The first pass already filled this third with the background; only
    // the depth needs resetting before drawing over it.
    renderer.clearDepth();
    renderer.autoClear = false;
    renderer.render(ctx.scene, near);
    show(deep, false);

    show(last, true);
    renderer.setViewport(rect.left, rect.bottom, rect.width, rect.height);
    renderer.setScissor(rect.left + rect.width - third, rect.bottom,
      third, rect.height);
    renderer.clearDepth();
    renderer.render(ctx.scene, camera);
    renderer.autoClear = autoClear;

    show(flat, true);
    show(deep, true);
  });

  // Anything a scene adds straight to the scene rather than to a panel has
  // to say which pass should draw it, or it gets drawn by all three - and
  // the perspective pass would then paint a full-width backdrop over the
  // panel it is supposed to be showing.
  ctx.drawFlat = (object) => {
    flat.push(object);
    return object;
  };

  const state = setup(panels, camera);

  let step = 0;
  function apply(v) {
    step = v;
    update(step, state);
  }

  ctx.ui.slider('time', {
    min: 0, max: steps - 1, step: 1, value: start, format: () => '',
  }, apply);

  apply(start);
  // `refresh` redraws the current step, for controls that change how the
  // recorded data is shown rather than which step is shown.
  return { panels, camera, state, refresh: () => apply(step) };
}

/**
 * A flat screen inside a panel, with a 2D canvas behind it.
 *
 * This is how the middle panel shows what the instrument recorded: a slice, a
 * photograph, a projection - all of them are images, so all of them are drawn
 * with the ordinary 2D canvas API and uploaded as a texture. Far simpler than
 * a second render pass, and it keeps the drawing code readable.
 */
export function makeFilm({
  width = 1.7, height = 1.7, pixels = 168, camera, border = '#c8ccd4',
} = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = pixels;
  canvas.height = Math.round(pixels * (height / width));
  const g = canvas.getContext('2d');

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.NearestFilter;   // show the pixels, they are data

  const group = new THREE.Group();
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: texture }),
  );
  group.add(mesh);
  group.add(new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.PlaneGeometry(width, height)),
    new THREE.LineBasicMaterial({ color: border }),
  ));
  if (camera) group.quaternion.copy(camera.quaternion);

  return {
    group,
    canvas,
    ctx: g,
    /** Call after drawing into `ctx`. */
    commit() { texture.needsUpdate = true; },
    clear(fill = '#111219') {
      g.fillStyle = fill;
      g.fillRect(0, 0, canvas.width, canvas.height);
    },
  };
}

/**
 * Replay a simulated acquisition.
 *
 * The panel captions and the step count come from the simulation's
 * manifest, so a scene only has to say how to draw the three panels - never
 * what the numbers are. The slider is called "time" on every slide,
 * whatever the thing that moves happens to be.
 *
 * `setup(panels, camera, data, sets)` builds the panels and returns its
 * state; `update(step, state, data, index)` moves them. Panel 2 is filled in
 * automatically if the scene asked for a film via `film`. A scene with only
 * one simulation can ignore `sets` and `index` entirely.
 *
 * Pass an array of `{ name, label }` instead of a single name to put several
 * simulations behind one control. That is how a slide covers a family rather
 * than an instrument: optical against physical sectioning, absorption
 * against phase contrast. Each gets its own film, because their recorded
 * frames are not the same shape; the scene decides what else to swap.
 */
export async function replay(ctx, spec, {
  start, frustum, film: filmSpec, scale = 1, field, choose,
  rule, setup, update,
}) {
  const wanted = Array.isArray(spec) ? spec : [{ name: spec }];
  const sets = await Promise.all(wanted.map(async (entry) => ({
    ...entry, data: await load(entry.name),
  })));
  let active = 0;
  let onSwitch = () => {};

  const data = sets[0].data;
  const m = data.manifest;

  const handle = triptych(ctx, {
    labels: m.labels,
    steps: m.steps,
    start: start ?? Math.floor(m.steps / 2),
    frustum,
    rule,

    setup(panels, camera) {
      // One scale for all three panels, so a thing that is the same size in
      // the world is the same size on the slide. Without this the recorded
      // image ends up bigger than the plane it was recorded from and the
      // assembled volume bigger than the specimen, which quietly suggests
      // the instrument covers more ground than it does.
      //
      // An array overrides that per panel, for the scenes where the middle
      // panel is not a picture of the scene at all - a contact sheet, a
      // gather - so matching its size to the specimen means nothing while
      // leaving the other two half empty.
      const per = Array.isArray(scale) ? scale : [scale, scale, scale];
      panels[0].scale.multiplyScalar(per[0]);
      panels[2].scale.multiplyScalar(per[2]);

      const films = sets.map((set, i) => {
        if (filmSpec === false || !set.data.manifest.frames) return null;
        const [tw, th] = set.data.manifest.frames.tile;
        // `field` is how wide the recorded frame is in world units - the
        // detector, the camera's field of view, the imaged plane - and when
        // a scene gives one the film is drawn at exactly that width, to the
        // same scale as the other two panels.
        //
        // Not every panel 2 is a picture of the scene, though. A spectrum
        // and a seismic gather have axes of their own, and matching them to
        // the specimen's size would be meaningless as well as illegible, so
        // those are sized to be read.
        // A dataset may override the field, because two contrasts on one
        // slide need not record the same shape of frame.
        const own = set.field ?? field;
        const width = own != null
          ? own * per[1]
          : (filmSpec?.width ?? 1.7);
        const made = makeFilm({
          camera, width, height: width * (th / tw),
          pixels: filmSpec?.pixels ?? Math.min(256, tw * 2),
        });
        made.group.visible = i === 0;
        panels[1].add(made.group);
        return made;
      });
      return {
        films,
        film: films[0],
        ...(setup?.(panels, camera, data, sets) || {}),
      };
    },

    update(step, state) {
      const set = sets[active];
      state.films?.forEach((f, i) => {
        if (f) f.group.visible = i === active;
      });
      const film = state.films?.[active];
      state.film = film;
      if (film) {
        const { canvas, ctx: g } = film;
        drawFrame(set.data, step, g, canvas.width, canvas.height);
        film.commit();
      }
      update?.(step, state, set.data, active);
    },
  });

  // The chooser goes in after the slider, so the time control stays first.
  if (sets.length > 1) {
    ctx.ui.choice(choose ?? 'kind', sets.map((s) => s.label ?? s.name),
      (index) => {
        active = index;
        handle.refresh();
        onSwitch(index);
      });
  }

  // The manifest's `note` is deliberately not rendered. It is the written
  // version of what the speaker says, and it belongs in the slide's speaker
  // notes; printing it under the illustration filled a third of the slide
  // with text nobody reads while it is being said out loud.
  return {
    data,
    sets,
    refresh: handle.refresh,
    onSwitch(fn) { onSwitch = fn; },
  };
}

/** The outline of the acquired volume, so panel 3 reads as a fixed space. */
export function volumeFrame(parent, bounds, color = '#9aa7b4') {
  const [bx, by, bz] = bounds;
  parent.add(new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(2 * bx, 2 * by, 2 * bz)),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.4 }),
  ));
}

/**
 * Points for panel 3, revealed in acquisition order.
 *
 * The loader has already sorted them by the step they appeared in, so showing
 * the cloud as it stood at any step is one draw range.
 */
export function makePoints(parent, points, { size = 0.034 } = {}) {
  // Little spheres rather than the square sprites a THREE.Points draws.
  // Sprites are flat, always face the camera and are sized in pixels, so a
  // cloud of them reads as a scatter plot pasted over the scene - turn the
  // panel and nothing about them changes. Spheres sit in the space, catch
  // the light and occlude each other, which is what makes a cloud look like
  // a measurement of a surface rather than a picture of one.
  //
  // The counts here are a couple of thousand, so one instanced draw call
  // costs nothing.
  const mesh = new THREE.InstancedMesh(
    new THREE.SphereGeometry(size / 2, 8, 6),
    new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0 }),
    Math.max(points.count, 1),
  );

  const m = new THREE.Matrix4();
  const c = new THREE.Color();
  for (let i = 0; i < points.count; i++) {
    m.makeTranslation(
      points.pos[i * 3], points.pos[i * 3 + 1], points.pos[i * 3 + 2]);
    mesh.setMatrixAt(i, m);
    // The stored colours are display values, so they are read as sRGB
    // rather than as linear - otherwise everything comes out washed out.
    c.setRGB(points.col[i * 3], points.col[i * 3 + 1], points.col[i * 3 + 2],
      THREE.SRGBColorSpace);
    mesh.setColorAt(i, c);
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.count = 0;
  mesh.frustumCulled = false;
  parent.add(mesh);

  return {
    mesh,
    /** Points are stored in acquisition order, so this is one assignment. */
    reveal(step) {
      const n = points.upTo[Math.min(step, 255)];
      mesh.count = n;
      return n;
    },
  };
}

/**
 * A height field for panel 3.
 *
 * For results that are a surface rather than a volume - a recovered phase, a
 * projected thickness, a migrated horizon. Drawing them as voxels would claim
 * depth information the measurement does not have, so they get a relief
 * instead: height and colour both from the value.
 */
export function makeField(parent, [w, h], {
  size = [2.2, 2.2], relief = 0.7, colors, smooth = 0, upright = false,
  fade = [0.04, 0.22],
}) {
  const geo = new THREE.PlaneGeometry(size[0], size[1], w - 1, h - 1);
  // Upright means the field faces the viewer and the relief comes towards
  // them, so it reads as an image that happens to have height. Laid flat it
  // reads as terrain, which is the wrong idea for something that is a
  // picture of a specimen.
  if (!upright) geo.rotateX(-Math.PI / 2);
  // Four components, because the empty part of the field has to disappear.
  // A lit plane is never the colour of the page behind it, so leaving it
  // opaque puts a grey plate under the result no matter how pale its
  // albedo is; fading it out instead leaves the specimen on the page.
  geo.setAttribute('color',
    new THREE.BufferAttribute(new Float32Array(w * h * 4), 4));
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.6,
    // Front faces only. With the sheet transparent, its back faces show
    // through wherever the relief is steep and read as a black outline
    // around everything - which is not a shadow, it is the inside of the
    // sheet.
    side: THREE.FrontSide,
    transparent: true,
    depthWrite: false,
  }));
  parent.add(mesh);

  const pos = geo.attributes.position;
  const col = geo.attributes.color;
  const c = new THREE.Color();
  return {
    mesh,
    update(field) {
      // Relief exaggerates single-pixel noise into spikes once it is lit, so
      // the height is smoothed while the colour stays on the raw value. The
      // surface reads as the field; the colour still reports it.
      let height = field;
      for (let pass = 0; pass < smooth; pass++) {
        const next = new Float32Array(w * h);
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            let sum = 0;
            let n = 0;
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                const xx = x + dx;
                const yy = y + dy;
                if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
                sum += height[yy * w + xx];
                n++;
              }
            }
            next[y * w + x] = sum / n;
          }
        }
        height = next;
      }
      for (let i = 0; i < w * h; i++) {
        const v = field[i];
        if (upright) pos.setZ(i, height[i] * relief);
        else pos.setY(i, height[i] * relief);
        c.set(colors(v));
        const t = Math.min(1, Math.max(0, (v - fade[0]) / (fade[1] - fade[0])));
        col.setXYZW(i, c.r, c.g, c.b, t * t * (3 - 2 * t));
      }
      pos.needsUpdate = true;
      col.needsUpdate = true;
      geo.computeVertexNormals();
    },
  };
}

/**
 * The specimen, drawn the same way in every acquisition scene.
 *
 * Panel 1 answers "what is the instrument looking at", and the answer has to
 * be the same object every time or the eight scenes stop reading as eight
 * views of one thing. So: one material, one set of colours, opaque. Scenes
 * that need to see inside it cut it with a clipping plane rather than fading
 * it out, because a half-transparent specimen looks like a rendering choice
 * and a cut one looks like what actually happened to it.
 */
export function specimen(shape, { detail = 40, clip = null } = {}) {
  const mesh = new THREE.Mesh(shape.geometry(detail),
    new THREE.MeshPhysicalMaterial({
      vertexColors: true,
      roughness: 0.52,
      clearcoat: 0.22,
      clearcoatRoughness: 0.45,
      ...(clip ? { clippingPlanes: [clip] } : {}),
    }));
  return mesh;
}

/**
 * Let the viewer spin one panel by dragging inside it.
 *
 * The triptych has OrbitControls off, because moving one shared camera would
 * swing all three panels at once and the point of the layout is that they are
 * three separate pictures. But panel 3 is the only one that is genuinely 3D,
 * and not being able to turn it is the difference between seeing a shape and
 * guessing at one - so it gets its own drag, applied to the group rather than
 * to the camera.
 */
export function spinnable(ctx, group, { from = 0.68, hint = true } = {}) {
  const el = ctx.el;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  const base = group.scale.x;
  let zoom = 1;

  const inPanel = (event) => {
    const box = el.getBoundingClientRect();
    return (event.clientX - box.left) / box.width >= from;
  };

  // The wheel zooms the panel rather than the shared camera, which would
  // drag the other two panels along with it. The panel is drawn in its own
  // pass with its own scissor, so a zoomed volume is clipped to its third
  // instead of spilling across the slide.
  el.addEventListener('wheel', (event) => {
    if (!inPanel(event)) return;
    event.preventDefault();
    zoom = Math.min(9, Math.max(0.6, zoom * Math.exp(-event.deltaY * 0.0016)));
    group.scale.setScalar(base * zoom);
  }, { passive: false });

  el.addEventListener('pointerdown', (event) => {
    if (!inPanel(event)) return;
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    el.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  });

  el.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    group.rotation.y += (event.clientX - lastX) * 0.01;
    // Clamped, so the panel cannot be tipped past upside down and lost.
    // Clamped so a tilted box cannot be tipped past upside down and lost.
    group.rotation.x = Math.max(-0.85, Math.min(0.85,
      group.rotation.x + (event.clientY - lastY) * 0.006));
    lastX = event.clientX;
    lastY = event.clientY;
  });

  for (const type of ['pointerup', 'pointercancel', 'pointerleave']) {
    el.addEventListener(type, (event) => {
      if (!dragging) return;
      dragging = false;
      el.releasePointerCapture?.(event.pointerId);
    });
  }

  // The runtime has already written the default hint by the time a scene
  // runs, so the element is updated rather than the dataset it came from.
  if (hint) {
    const label = el.querySelector('.viz3d-hint');
    if (label) label.textContent = 'right panel: drag to turn, scroll to zoom';
  }
  return group;
}

/**
 * The look every assembled volume shares.
 *
 * Two reasons it is one look and not five.
 *
 * The first is honesty about colour. A confocal channel, an attenuation
 * coefficient, a backscatter amplitude - each of these is one number per
 * voxel. None of them is a colour. Giving each modality its own hue implies
 * the instruments measured something different in kind, when what differs is
 * only what the number means. So the scalar volumes all get the same
 * deliberately neutral ramp, and the slides can say out loud that the colour
 * was chosen rather than measured.
 *
 * The second is comparison. These panels are meant to be read against each
 * other across eight slides; if the rendering style changes between them,
 * every difference looks like it might be a difference in the data.
 *
 * The exceptions are the ones where colour is not a choice: photogrammetry
 * records real RGB because it is photographs, and a scanning probe separates
 * genuinely different measurements per element, so those get colours that
 * mean something.
 */
export const MEASURED = [
  '#f4f7fa', '#c4cfda', '#8494a5', '#42525f', '#151d26',
];

/** Transfer-function settings shared by the assembled volumes. */
export const MEASURED_STYLE = {
  stops: MEASURED, width: 0.11, density: 0.095, curve: 1.7,
  edge: 0.38, ambient: 0.46, steps: 190,
};

/**
 * The other look, for volumes whose signal is emitted rather than absorbed.
 *
 * Which one a panel gets is not a style preference, it follows the physics,
 * and the giveaway is panel 2. A radiograph is dark specimen on a bright
 * field, because what is measured is the beam that failed to arrive; the
 * assembled volume should read the same way, on the page. A fluorescence
 * image is bright signal on a dark field, because what is measured is light
 * the specimen gave off; so is an electron image of a cut face. Rendering
 * either of those on white would inverto the one thing the slide is about.
 */
// Weighted bright, on purpose. A ray accumulates front to back and goes
// opaque partway through, so what you mostly see is the colour of the first
// material it met - the dim rim of the specimen, not its bright middle. A
// ramp that is dark at the low end therefore renders a bright object as a
// dark one. Lifting the low and middle stops puts the apparent brightness
// back where the image in panel 2 has it.
export const EMITTED = [
  '#0b1017', '#6b7d91', '#b6c4d3', '#e8eff6', '#ffffff',
];

// No shading and no edge weighting at all: this is plain
// emission-absorption, which for a stack of fluorescence images is the
// whole of the physics.
//
// Both of the things switched off here are surface tricks. Gradient
// lighting shades a voxel by which way the field happens to slope, and
// edge weighting hides the inside of anything uniform - together they make
// a volume look like a lit mesh, because that is what they are for. A
// fluorophore does not emit less light for facing away from a lamp, and
// the bright inside of a labelled structure is the measurement, not
// something to suppress.
//
// What is left is the textbook loop: sample, look the value up in a
// transfer function, accumulate colour and opacity, stop when the ray is
// opaque. Nothing else.
export const EMITTED_STYLE = {
  stops: EMITTED, width: 0.075, density: 0.12, curve: 2.6,
  edge: 0, shade: 0, ambient: 1, steps: 210,
  // Nearest, so the samples stay samples. Zoom in and the voxels the
  // microscope actually recorded are there to see, which is the point of a
  // slide about what a volume is.
  interpolate: false,
};

/**
 * A dark plate behind the whole triptych, for the emission case.
 *
 * Emission-absorption composites what the ray collected over whatever is
 * behind it, so an emissive volume on a white page loses its brightest
 * parts to the background. Every volume viewer puts that kind of data on
 * black, and so does this.
 *
 * A plate rather than `scene.background`: the background fills the entire
 * placeholder, which in the deck is whatever height the slide has left, so
 * it swallows the caption lines and the footer underneath as well.
 */
export function backdrop(ctx, camera, {
  width = 28, height = 8, color = '#0a0d13', distance = 4,
} = {}) {
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ color }),
  );
  plate.quaternion.copy(camera.quaternion);
  const back = new THREE.Vector3();
  camera.getWorldDirection(back);
  plate.position.copy(back).multiplyScalar(distance);
  ctx.scene.add(plate);
  // The orthographic pass owns it: it spans all three panels.
  ctx.drawFlat?.(plate);
  return plate;
}
