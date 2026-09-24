// Shared runtime for the interactive 3D illustrations in the slides.
//
// Every illustration on a page draws through ONE WebGLRenderer. Browsers cap
// the number of live WebGL contexts at around sixteen and silently kill the
// oldest ones past that, which during a talk looks like slides going blank, so
// a renderer per illustration is not an option. Instead there is a single
// canvas pinned over the viewport, and each frame every visible illustration
// gets the scissor rectangle of its placeholder. Reveal runs with
// `disableLayout: true`, so slides are laid out by normal CSS and a
// getBoundingClientRect is where the placeholder actually is.
//
// The loop only runs while at least one placeholder is on screen, so a deck
// parked on a text slide costs nothing.
//
// A scene file is expected to be small - see scenes/ for examples:
//
//   import { defineScene, THREE } from '../runtime.js';
//   defineScene('my-scene', (ctx) => {
//     ctx.scene.add(new THREE.Mesh(geometry, material));
//     ctx.ui.toggle('Wireframe', false, (on) => { ... });
//     return { tick: (t) => { ... } };   // optional, t is seconds
//   });

import * as THREE from '../vendor/three.bundle.js';

export { THREE };

/**
 * Keep side-by-side panels under their captions.
 *
 * The captions are equal columns of the placeholder, but how much world the
 * orthographic camera shows depends on the shape of the box it is drawn in -
 * so a fixed spacing only lines up at one aspect ratio. Reading the camera's
 * own frustum every frame and spacing the panels by a share of it lines them
 * up at every aspect instead.
 */
export function spreadPanels(camera, panels) {
  const pitch = (camera.right - camera.left) / panels.length;
  const first = -pitch * (panels.length - 1) / 2;
  panels.forEach((g, i) => { g.position.x = first + i * pitch; });
}

/**
 * The row of captions under a multi-panel illustration.
 *
 * Under, not inside. A caption drawn in the scene is sized in world units,
 * so it grows and shrinks with the frustum and ends up either unreadable or
 * enormous - and a label describing a picture has no business living inside
 * the space the picture is of.
 */
export function panelStrip(el, labels) {
  const strip = document.createElement('div');
  strip.className = 'viz3d-panels';
  strip.style.gridTemplateColumns = `repeat(${labels.length}, 1fr)`;
  for (const [i, entry] of labels.entries()) {
    // A plain string is just the caption. An object carries the paragraph
    // that belongs under that panel - in the same grid, so it sits under the
    // picture it describes instead of turning into a bullet list further
    // down the slide that the reader has to pair up by hand.
    const { title, body } = typeof entry === 'string' ? { title: entry } : entry;
    const cell = document.createElement('span');
    cell.innerHTML = `<b>${i + 1}</b> ${title}`
      + (body ? `<i class="viz3d-panel-body">${body}</i>` : '');
    strip.appendChild(cell);
  }
  el.insertAdjacentElement('afterend', strip);
  return strip;
}

/**
 * A row of small canvases under a multi-panel illustration.
 *
 * For a plot that belongs to a panel but is not part of the scene - a
 * transfer function beside the volume it produced, say. A 2D curve drawn into
 * the 3D scene would be sized in world units and would turn with the camera;
 * drawn here it stays a plot, in the same grid as the captions.
 *
 * Returns one 2D context per panel, already scaled for the device pixel
 * ratio, plus a `resize` to call if the illustration changes width.
 */
export function panelPlots(el, count, { height = 52 } = {}) {
  const strip = document.createElement('div');
  strip.className = 'viz3d-plots';
  strip.style.gridTemplateColumns = `repeat(${count}, 1fr)`;
  const canvases = [];
  for (let i = 0; i < count; i++) {
    const canvas = document.createElement('canvas');
    canvas.style.height = `${height}px`;
    strip.appendChild(canvas);
    canvases.push(canvas);
  }
  el.insertAdjacentElement('afterend', strip);

  const contexts = canvases.map((c) => c.getContext('2d'));
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvases.forEach((c, i) => {
      const w = Math.max(1, Math.round(c.clientWidth * dpr));
      const h = Math.max(1, Math.round(height * dpr));
      if (c.width !== w || c.height !== h) {
        c.width = w;
        c.height = h;
      }
      contexts[i].setTransform(dpr, 0, 0, dpr, 0, 0);
    });
  }
  resize();
  return { contexts, canvases, resize, strip };
}

/**
 * Drag to turn a row of panels, wheel to zoom - all of them together.
 *
 * Not OrbitControls. The panels sit side by side in world space, so orbiting
 * the camera about the origin swings the outer ones through depth and the row
 * stops being a row. Turning each panel's own group instead keeps the strip
 * intact and keeps every panel at the same angle, which is the whole point of
 * putting them next to each other.
 *
 * No zoom. Zooming the shared camera magnifies the gaps between panels as
 * well as the panels, so they walk out of the caption grid underneath them -
 * and a row that no longer lines up with its labels is worse than a row you
 * cannot zoom.
 */
export function panelOrbit(ctx, panels) {
  const drag = { on: false, x: 0, y: 0 };
  let yaw = 0;
  let pitch = 0;

  ctx.el.addEventListener('pointerdown', (e) => {
    drag.on = true;
    drag.x = e.clientX;
    drag.y = e.clientY;
    ctx.el.setPointerCapture(e.pointerId);
  });
  ctx.el.addEventListener('pointermove', (e) => {
    if (!drag.on) return;
    yaw += (e.clientX - drag.x) * 0.008;
    // Clamped: past the poles the specimen is upside down and nothing on
    // screen tells you so.
    pitch = THREE.MathUtils.clamp(pitch + (e.clientY - drag.y) * 0.008, -1.1, 1.1);
    drag.x = e.clientX;
    drag.y = e.clientY;
  });
  for (const evt of ['pointerup', 'pointercancel', 'pointerleave']) {
    ctx.el.addEventListener(evt, (e) => {
      if (!drag.on) return;
      drag.on = false;
      if (ctx.el.hasPointerCapture?.(e.pointerId)) {
        ctx.el.releasePointerCapture(e.pointerId);
      }
    });
  }
  /** Call from tick(), after spreadPanels. */
  return function apply() {
    for (const p of panels) {
      p.rotation.y = yaw;
      p.rotation.x = pitch;
    }
  };
}

/**
 * Colours for the illustrations.
 *
 * Anchored on the theme's red and blue so a scene sits in the deck rather than
 * on top of it, then extended with hues that hold up next to them. The tints
 * and shades of each are here rather than computed per scene, because lerping
 * to white washes out the hue and lerping to black muddies it - these are
 * picked by eye to keep the hue as the value changes.
 */
export const palette = {
  accent: '#e1462c',   // Helmholtz red
  blue: '#0059a0',     // Helmholtz blue
  dark: '#232430',
  grey: '#9a9aa4',
  light: '#dcdce4',
  paper: '#fbfbfd',

  rose: '#e2685f',
  roseDeep: '#a83250',
  roseLight: '#f3a99b',

  teal: '#1f7a8c',
  tealLight: '#7fc2c9',

  amber: '#e2a13c',
  amberLight: '#f6d29a',

  plum: '#6a4b86',
  sage: '#5d8c6a',
  ice: '#bcd8ea',
  iceDeep: '#2c5f86',
};

/** Interpolate a list of hex stops; `t` runs 0..1. Used for every ramp. */
export function ramp(stops, t) {
  const cols = stops.map((c) => new THREE.Color(c));
  const s = Math.min(0.9999, Math.max(0, t)) * (cols.length - 1);
  const i = Math.floor(s);
  return cols[i].lerp(cols[i + 1], s - i);
}

/**
 * Empty a group, releasing the GPU resources its children held.
 *
 * Scenes with a density or resolution slider rebuild their contents on every
 * input event, and Group.clear() on its own only drops the references - the
 * buffers stay allocated until the context is lost. Dragging a slider across
 * its range is a few hundred rebuilds.
 */
export function clearGroup(group) {
  group.traverse((child) => {
    if (child === group) return;
    child.geometry?.dispose();
    const mat = child.material;
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
    else mat?.dispose();
  });
  group.clear();
}

/**
 * A text label that always faces the viewer and never changes size.
 *
 * Drawn into a canvas rather than built from glyph geometry: no font file to
 * vendor, crisp at any zoom, and one draw call. `sizeAttenuation: false` is
 * what keeps it the same size on screen however far away it is anchored -
 * without it a label shrinks with its subject and stops being legible, which
 * defeats the point of labelling anything.
 */
export function makeLabel(text, {
  color = '#232430', size = 15, weight = 600, padding = 6, scale = 0.09,
} = {}) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const font = `${weight} ${size}px ui-sans-serif, system-ui, sans-serif`;
  const measure = document.createElement('canvas').getContext('2d');
  measure.font = font;
  const w = Math.ceil(measure.measureText(text).width) + padding * 2;
  const h = Math.ceil(size * 1.5) + padding;

  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(w * dpr);
  canvas.height = Math.ceil(h * dpr);
  const g = canvas.getContext('2d');
  g.scale(dpr, dpr);
  g.font = font;
  g.textBaseline = 'middle';
  g.fillStyle = color;
  g.fillText(text, padding, h / 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: tex, transparent: true, sizeAttenuation: false, depthTest: false,
    depthWrite: false,
  }));
  sprite.scale.set((w / h) * scale, scale, 1);
  sprite.renderOrder = 10;
  return sprite;
}

/**
 * A label at `to`, with a thin leader line back to the thing it names at
 * `from`. Returns a group; add it to the scene.
 */
export function annotate(text, from, to, opts = {}) {
  const group = new THREE.Group();
  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3().fromArray(from), new THREE.Vector3().fromArray(to),
    ]),
    new THREE.LineBasicMaterial({
      color: opts.lineColor || '#8b8b96', transparent: true, opacity: 0.9,
      depthTest: false,
    }),
  );
  line.renderOrder = 9;
  group.add(line);

  const dot = new THREE.Mesh(
    new THREE.SphereGeometry(0.022, 12, 8),
    new THREE.MeshBasicMaterial({ color: opts.lineColor || '#8b8b96', depthTest: false }),
  );
  dot.position.fromArray(from);
  dot.renderOrder = 9;
  group.add(dot);

  const label = makeLabel(text, opts);
  label.position.fromArray(to);
  // Nudge the label off the end of its leader so the two do not touch, and to
  // the side the leader came from, so text never overlaps the specimen.
  const away = to[0] >= from[0] ? 1 : -1;
  label.center.set(away > 0 ? 0 : 1, 0.5);
  label.position.x += away * 0.03;
  group.add(label);
  return group;
}

const setups = new Map();   // scene name -> setup function
const live = [];            // mounted instances, in document order

let running = false;
let visibleCount = 0;
let observer = null;
let webglFailed = false;

/**
 * How many WebGL contexts to keep alive at once.
 *
 * One canvas per illustration, but not one context per illustration: the
 * overview page has fourteen scenes and browsers cap contexts per renderer
 * process - sixteen in Chrome, shared between tabs of the same site, and
 * lower in Safari - so a page that took one each would be a tab away from
 * losing them. Contexts are made when a scene comes near the viewport and
 * the least recently seen is dropped past this many, which on a scroll
 * through the overview means three or four alive at a time.
 *
 * Big enough that scrolling back a slide or two does not pay for a context
 * again: a new one has to recompile every shader the scene uses, and the
 * volume ray marcher is not a small program.
 */
const CONTEXT_BUDGET = 6;

/** Instances holding a renderer, least recently drawn first. */
const withContext = [];

// ---------------------------------------------------------------- stylesheet

// Injected from here rather than shipped as a stylesheet the theme would have
// to link: the runtime is the only thing that needs it, and the shortcode
// already loads the runtime.
const CSS = `
/* align-self matters: a slide section is a flex container, so without it the
   figure is sized by its widest line of text - which is the caption. */
.viz3d-figure { margin: 0 0 8px; display: flex; flex-direction: column;
  align-items: stretch; align-self: stretch; flex: 1; min-width: 0; }
/* width:100% because the theme lays a figure inside {{< horizontal >}} out
   as a centring flex column, which shrinks a plain block child to nothing -
   the placeholder has no content of its own to give it a width. */
/* No border and no panel background: an illustration reads as part of the
   page it is explaining, not as a widget embedded in it. The scenes draw on
   a transparent canvas over the page, so the page's own background is what
   shows through. */
.viz3d { position: relative; touch-action: none; cursor: grab; flex: 1 1 auto;
  width: 100%; min-height: var(--viz3d-height, 400px); }
/* On a slide the height from the shortcode is a wish, not a floor. A 720p
   projector does not have room for two headings, a 420px illustration, its
   controls and the footer, and a min-height it cannot shrink below pushes the
   caption underneath the footer. Let it take what is left instead. */
.reveal .viz3d { min-height: 140px; }
.viz3d:active { cursor: grabbing; }
.viz3d-panels { display: grid; grid-template-columns: repeat(3, 1fr);
  gap: 0 1rem; margin: 2px 0 0; font-size: 11px; line-height: 1.3;
  letter-spacing: 0.04em; text-transform: uppercase; color: #6a6a78; }
.viz3d-panels span { text-align: center; }
.viz3d-panels .viz3d-panel-body { display: block; margin: 5px auto 0; max-width: 34ch;
  font-style: normal; text-transform: none; letter-spacing: normal;
  font-size: 12.5px; line-height: 1.45; color: #40414c; }
.viz3d-panels b { color: #a8a8b2; margin-right: 0.35em; }
.viz3d-plots { display: grid; gap: 0 1rem; margin: 6px 0 0; }
.viz3d-plots canvas { width: 100%; display: block; }
.viz3d-hint { position: absolute; right: 8px; bottom: 6px; margin: 0;
  font: 400 11px/1.3 sans-serif; color: #9a9aa4; pointer-events: none;
  letter-spacing: .02em; }
.viz3d-ui { display: flex; flex-wrap: wrap; gap: 6px 10px; align-items: center;
  padding: 8px 2px 0; font-family: sans-serif; font-size: 13px; }
.viz3d-ui .viz3d-group { display: flex; align-items: center; gap: 6px; }
.viz3d-ui label { color: #6a6a74; font-size: 12px; text-transform: uppercase;
  letter-spacing: .05em; }
.viz3d-ui button { font: inherit; font-size: 12px; padding: 4px 10px;
  border: 1px solid #d8d8de; border-radius: 999px; background: #fff;
  color: #222224; cursor: pointer; line-height: 1.4; }
.viz3d-ui button:hover { border-color: #9a9aa4; }
.viz3d-ui button[aria-pressed="true"] { background: #222224; color: #fff;
  border-color: #222224; }
.viz3d-ui input[type=range] { width: 120px; accent-color: #e1462c;
  vertical-align: middle; }
.viz3d-ui output { color: #6a6a74; font-variant-numeric: tabular-nums;
  min-width: 3.2em; font-size: 12px; }
.viz3d-note { margin: 8px 0 0; padding: 7px 11px; border-left: 3px solid #c8cdd6;
  background: #f4f5f8; border-radius: 0 4px 4px 0;
  font: 400 13.5px/1.5 sans-serif; color: #40414c; }
.viz3d-note:empty { display: none; }
.viz3d-figure figcaption { font: 400 13px/1.45 sans-serif; color: #6a6a74;
  padding: 8px 2px 0; }
/* The deck's footer is fixed over the bottom of every slide. The illustration
   grows to fill the slide, so without this the controls and the caption end up
   underneath it. */
.reveal .viz3d-figure { margin-bottom: 74px; }
/* The canvas is a child of the placeholder and fills it, so the browser
   scrolls and composites it with everything else. pointer-events off keeps
   the drag on the placeholder, which is what OrbitControls listens to. */
.viz3d > canvas { position: absolute; inset: 0; width: 100%; height: 100%;
  display: block; pointer-events: none; }
.viz3d-fallback { display: flex; align-items: center; justify-content: center;
  height: 100%; padding: 16px; box-sizing: border-box; text-align: center;
  font: 400 13px/1.5 sans-serif; color: #9a9aa4; }
@media print { .viz3d > canvas { display: none; } }
`;

function injectCSS() {
  if (document.getElementById('viz3d-css')) return;
  const style = document.createElement('style');
  style.id = 'viz3d-css';
  style.textContent = CSS;
  document.head.appendChild(style);
}

// ------------------------------------------------------------------ renderer

/**
 * Is WebGL available at all?
 *
 * Asked once, with a throwaway context that is handed straight back, so
 * that a browser with WebGL switched off gets the fallback sentence
 * instead of fourteen empty boxes.
 */
let webglOK = null;
function webglSupported() {
  if (webglOK !== null) return webglOK;
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2') || probe.getContext('webgl');
    webglOK = !!gl;
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch (err) {
    webglOK = false;
    console.warn('viz3d: WebGL unavailable,', err);
  }
  return webglOK;
}

/** One attempt at a context, or null with the reason logged. */
function makeRenderer(inst) {
  try {
    return new THREE.WebGLRenderer({
      canvas: inst.canvas, antialias: true, alpha: true,
    });
  } catch (err) {
    console.error('viz3d: no WebGL context for '
      + `"${inst.el.dataset.scene}"`, err);
    return null;
  }
}

/** Give an instance a renderer of its own, evicting one if we are at budget. */
function acquireContext(inst) {
  if (inst.failed) return null;
  if (inst.renderer) {
    // Freshen its place in the queue: eviction takes from the front.
    const at = withContext.indexOf(inst);
    if (at > -1 && at !== withContext.length - 1) {
      withContext.splice(at, 1);
      withContext.push(inst);
    }
    return inst.renderer;
  }
  if (webglFailed || !webglSupported()) return null;

  while (withContext.length >= CONTEXT_BUDGET) {
    const victim = withContext.shift();
    if (victim === inst) continue;
    releaseContext(victim);
  }

  // Asking twice, with a context handed back in between.
  //
  // Refusing to make one is usually the browser saying it has too many
  // open, and its ceiling is not ours to know: it counts contexts across
  // every tab of the site, so a second copy of the deck open next door
  // halves whatever we budgeted for. Freeing one of ours and asking again
  // is the difference between "someone else is using them" and "this
  // scene cannot be drawn".
  let renderer = makeRenderer(inst);
  if (!renderer && withContext.length) {
    releaseContext(withContext.shift());
    renderer = makeRenderer(inst);
  }
  if (!renderer) {
    // This scene's problem, not the whole page's - and not WebGL's either.
    // The first version of this marked WebGL as unavailable and put "this
    // browser has switched WebGL off" on all fourteen scenes, which was
    // wrong twice over: the browser had not, and the other thirteen were
    // drawing perfectly at the time.
    inst.failed = true;
    showFallback(inst.el, SCENE_FAILED);
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  // Shadow maps on for everyone. Only one scene casts any, and the cost of
  // the extra pass is proportional to the casters there are - which is
  // zero everywhere else.
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  // Off by default in three.js, and needed by any scene that sets
  // material.clippingPlanes - the cutting scenes do.
  renderer.localClippingEnabled = true;
  renderer.setClearAlpha(0);

  // A lost context (laptop sleeping mid-talk, GPU driver reset, or this
  // very budget evicting it) is recoverable: forget the renderer and let
  // the next frame build another.
  inst.canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    inst.renderer = null;
    inst.sizedTo = '';
    const at = withContext.indexOf(inst);
    if (at > -1) withContext.splice(at, 1);
  });

  inst.renderer = renderer;
  inst.sizedTo = '';
  withContext.push(inst);
  return renderer;
}

/** Hand a context back to the browser. */
function releaseContext(inst) {
  if (!inst.renderer) return;
  inst.renderer.dispose();
  // dispose() frees three's own caches but leaves the context itself for
  // the garbage collector, which is too late when the point is to stay
  // under a hard limit. Drop it now.
  inst.renderer.forceContextLoss();
  inst.renderer = null;
  inst.sizedTo = '';

  // And then throw the canvas away too.
  //
  // A canvas that has had its context force-lost never gets another one -
  // getContext keeps handing back the same dead context, so
  // `new WebGLRenderer({ canvas })` on it fails. Scrolling down the page
  // therefore worked and scrolling back up did not: every scene whose
  // context had been evicted on the way down refused to come back. The
  // element itself has to be replaced, which is cheap; it has no state
  // worth keeping.
  const fresh = document.createElement('canvas');
  inst.canvas.replaceWith(fresh);
  inst.canvas = fresh;
}

const NO_WEBGL = 'This illustration needs WebGL, which this browser has '
  + 'switched off.';
const SCENE_FAILED = 'This illustration failed to load - the error is in the '
  + 'browser console.';

/**
 * Replace a placeholder with a line of text saying why it is empty.
 *
 * Two different things can empty a placeholder and they are not the same
 * problem, so they do not get the same sentence. Blaming WebGL for a scene
 * that threw sends the reader - and whoever is editing the scene - looking in
 * entirely the wrong place; the scene's own exception is in the console.
 */
function showFallback(el, message = NO_WEBGL) {
  el.innerHTML = `<div class="viz3d-fallback">${message}</div>`;
}

// ---------------------------------------------------------------- frame loop

let lastW = 0;
let lastH = 0;

/**
 * Is this placeholder actually on screen?
 *
 * A bounding rectangle is not enough. Reveal keeps the slides on either side
 * of the current one laid out at `opacity: 0` so it can cross-fade to them, so
 * a neighbouring slide's placeholder reports the same rectangle as the visible
 * one - and since they overlap exactly, whichever is drawn second wins and you
 * get the next slide's illustration on this slide.
 */
function isVisible(el) {
  return el.checkVisibility
    ? el.checkVisibility({ opacityProperty: true, visibilityProperty: true })
    : true;   // pre-2022 browsers fall back to the rectangle test
}

/** Pull the camera back along its current direction until a sphere of
 *  `inst.fitRadius` about the orbit target fits both axes of the box. */
function fitCamera(inst, aspect) {
  const cam = inst.camera;
  const vFov = THREE.MathUtils.degToRad(cam.fov);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
  const dist = Math.max(
    inst.fitRadius / Math.sin(vFov / 2),
    inst.fitRadius / Math.sin(hFov / 2),
  );
  const dir = cam.position.clone().sub(inst.controls.target).normalize();
  cam.position.copy(inst.controls.target).addScaledVector(dir, dist);
  inst.controls.saveState();
  inst.controls.update();
}

function frame(now) {
  if (!running) return;
  const h = window.innerHeight;
  const w = window.innerWidth;
  const t = now / 1000;

  for (const inst of live) {
    // Rectangle first, `checkVisibility` second, and the order matters.
    //
    // Every mounted scene on the page is walked every frame - fourteen of
    // them on the overview - while only one or two are ever on screen.
    // getBoundingClientRect is a read of layout that has to happen anyway
    // for the one we draw, and it already catches the common cases: a
    // hidden slide measures zero, and a scene scrolled past is outside the
    // viewport. checkVisibility is a style query and only adds
    // `visibility: hidden` and `opacity: 0`, which no scene here uses, so
    // asking it about all fourteen first was a dozen style resolutions per
    // frame spent to learn nothing.
    const r = inst.el.getBoundingClientRect();
    // Zero-sized means the slide is hidden outright; off-viewport means the
    // scroll view has scrolled past it. Either way there is nothing to draw.
    if (r.width < 1 || r.height < 1) continue;
    if (r.bottom <= 0 || r.top >= h || r.right <= 0 || r.left >= w) continue;
    if (!isVisible(inst.el)) continue;

    const renderer = acquireContext(inst);
    if (!renderer) continue;

    // Round, because a placeholder in a flex row lands on fractional
    // pixels and resizing the drawing buffer every frame to chase a
    // rounding difference reallocates it every frame.
    const cw = Math.round(r.width);
    const ch = Math.round(r.height);
    const size = cw + 'x' + ch;
    if (inst.sizedTo !== size) {
      renderer.setSize(cw, ch, false);
      inst.sizedTo = size;
    }

    const aspect = cw / ch;
    if (inst.camera.isPerspectiveCamera) {
      if (inst.camera.aspect !== aspect) {
        inst.camera.aspect = aspect;
        inst.camera.updateProjectionMatrix();
      }
      // A slide is a wide, short box and the same scene on the scrolling page
      // is wider still, so a camera distance picked by hand is wrong in one of
      // them. Re-derive it from whatever shape the box turns out to be.
      if (inst.fitRadius && inst.fittedAspect !== aspect) {
        fitCamera(inst, aspect);
        inst.fittedAspect = aspect;
      }
    } else if (inst.camera.isOrthographicCamera) {
      // Height normally decides the frustum, but a scene laid out side by side
      // has a width it cannot afford to lose - on the scrolling page the box is
      // much less wide than a slide, and panels would be cropped off the ends.
      // Take whichever constraint is tighter.
      const half = Math.max(
        inst.frustumHeight / 2,
        inst.frustumWidth ? (inst.frustumWidth / 2) / aspect : 0,
      );
      inst.camera.top = half;
      inst.camera.bottom = -half;
      inst.camera.left = -half * aspect;
      inst.camera.right = half * aspect;
      inst.camera.updateProjectionMatrix();
    }

    inst.controls.update();
    if (inst.api && inst.api.tick) inst.api.tick(t, inst);

    // A scene can take over drawing entirely. Nothing does at the moment -
    // the triptych this was built for now spreads its panels with one
    // camera - so this is an extension point with no users. The rectangle
    // it gets is the canvas, which is now the whole of the scene's box.
    if (inst.api && inst.api.draw) {
      inst.api.draw(renderer, { left: 0, bottom: 0, width: cw, height: ch },
        inst);
    } else {
      renderer.render(inst.scene, inst.camera);
    }
  }
  requestAnimationFrame(frame);
}

function start() {
  if (running || visibleCount === 0 || !webglSupported()) return;
  running = true;
  requestAnimationFrame(frame);
}

function stop() {
  running = false;
}

// -------------------------------------------------------------------- the UI

function makeUI(bar) {
  const group = (labelText) => {
    const g = document.createElement('div');
    g.className = 'viz3d-group';
    if (labelText) {
      const l = document.createElement('label');
      l.textContent = labelText;
      g.appendChild(l);
    }
    bar.appendChild(g);
    return g;
  };

  return {
    /** Mutually exclusive options, rendered as a row of pill buttons. */
    choice(labelText, options, onChange, initial = 0) {
      const g = group(labelText);
      const buttons = options.map((opt, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = opt;
        b.setAttribute('aria-pressed', String(i === initial));
        b.addEventListener('click', () => {
          buttons.forEach((other, j) =>
            other.setAttribute('aria-pressed', String(i === j)));
          onChange(i, opt);
        });
        g.appendChild(b);
        return b;
      });
      onChange(initial, options[initial]);
      return { select: (i) => buttons[i].click() };
    },

    /** An on/off button that reports its state. */
    toggle(labelText, initial, onChange) {
      const g = group(null);
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = labelText;
      let on = initial;
      b.setAttribute('aria-pressed', String(on));
      b.addEventListener('click', () => {
        on = !on;
        b.setAttribute('aria-pressed', String(on));
        onChange(on);
      });
      g.appendChild(b);
      onChange(on);
      return {
        el: g,
        set: (v) => { if (v !== on) b.click(); },
        // display rather than [hidden]: the control groups are flex items,
        // and the stylesheet's display wins over the attribute.
        show: (visible) => { g.style.display = visible ? '' : 'none'; },
      };
    },

    /** A continuous parameter. `format` turns the value into its readout. */
    slider(labelText, { min, max, step = 0.01, value, format }, onChange) {
      const g = group(labelText);
      const input = document.createElement('input');
      input.type = 'range';
      Object.assign(input, { min, max, step, value });
      const out = document.createElement('output');
      const show = (v) => { out.textContent = format ? format(v) : String(v); };
      input.addEventListener('input', () => {
        const v = parseFloat(input.value);
        show(v);
        onChange(v);
      });
      g.append(input, out);
      show(value);
      onChange(value);
      return { set: (v) => { input.value = v; input.dispatchEvent(new Event('input')); } };
    },

    /** A live number the scene writes to, e.g. a triangle count. */
    readout(labelText) {
      const g = group(labelText);
      const out = document.createElement('output');
      g.appendChild(out);
      return (text) => { out.textContent = text; };
    },

    /**
     * A line of prose under the controls, which the scene can rewrite.
     *
     * For the thing a slide would otherwise have to say in a bullet - what a
     * representation actually is, what is in the file. Keeping it in the
     * scene means it changes with the scene instead of describing whichever
     * state the presenter happened to leave it in.
     */
    note(text = '') {
      const line = document.createElement('p');
      line.className = 'viz3d-note';
      line.textContent = text;
      bar.insertAdjacentElement('afterend', line);
      return (next) => { line.textContent = next; };
    },

    /** A one-shot action, e.g. "Reset view". */
    button(labelText, onClick) {
      const g = group(null);
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = labelText;
      b.addEventListener('click', onClick);
      g.appendChild(b);
      return b;
    },
  };
}

// ------------------------------------------------------------------ mounting

/** True while the page is showing the Reveal deck rather than scrolling text. */
function inSlideView() {
  const page = document.getElementById('page-content');
  return !!page && page.classList.contains('reveal');
}

let environment = null;

/**
 * A soft studio environment, built once and shared by every scene.
 *
 * This is the single biggest thing separating a render that looks like a
 * diagram from one that looks like a photograph. Directional lights alone give
 * flat facets and hard terminators; an environment map lights every surface
 * from every direction, so curvature reads smoothly and materials pick up a
 * cool sky above and a warm bounce below.
 *
 * Generated from a four-pixel-wide gradient rather than loaded from a file:
 * an HDR would be another megabyte to vendor for something a viewer only ever
 * sees as soft shading.
 */
function ensureEnvironment() {
  if (environment) return environment;
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 256;
  const g = canvas.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0.00, '#ffffff');   // zenith
  grad.addColorStop(0.35, '#e8eef6');
  grad.addColorStop(0.55, '#cfd6e0');   // horizon
  grad.addColorStop(0.75, '#b9b2ad');
  grad.addColorStop(1.00, '#8e8880');   // warm ground bounce
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 256);

  const tex = new THREE.CanvasTexture(canvas);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  // Handed over as an equirectangular map rather than run through
  // PMREMGenerator here. The generator needs a renderer, and scenes are now
  // built before any context exists - each one gets its own, lazily, when
  // it first comes near the viewport. Three prefilters an environment
  // texture itself, per renderer, the first time it draws with it, so the
  // result is the same and nothing has to own a renderer this early.
  environment = tex;
  return environment;
}

function defaultLights(scene) {
  scene.environment = ensureEnvironment();
  scene.environmentIntensity = 1.15;
  // One key light on top of the environment, for a readable direction of
  // light and a highlight to catch the eye; and a weak rim from behind, which
  // is what stops a dark specimen from merging into a dark background.
  const key = new THREE.DirectionalLight(0xfff6ec, 1.7);
  key.position.set(4, 6, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xdfe8ff, 0.7);
  rim.position.set(-4, 2.5, -5);
  scene.add(rim);
}

function mount(el, setup) {
  if (!webglSupported()) {
    showFallback(el);
    return;
  }

  // The canvas exists from the start; the context behind it does not, and
  // is made when the scene first comes near the viewport.
  const canvas = document.createElement('canvas');
  el.appendChild(canvas);

  const scene = new THREE.Scene();
  // Both cameras exist from the start so a scene can switch between them
  // without rebuilding anything - the projection-choice scene does exactly
  // that, and it is the one place where the difference is the subject.
  // The orthographic near plane is negative on purpose: it lets the camera see
  // things behind it, which is what keeps a backdrop plane from being clipped
  // away as the view is orbited.
  const perspective = new THREE.PerspectiveCamera(40, 1, 0.1, 500);
  const orthographic = new THREE.OrthographicCamera(-2, 2, 2, -2, -200, 500);
  const camera = perspective;
  camera.position.set(3.2, 2.4, 4.4);
  defaultLights(scene);

  const controls = new THREE.OrbitControls(camera, el);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  // Anything you can turn, you can also zoom. The wheel over an
  // illustration therefore does not scroll the page - which is a real cost
  // on the scrolling view, but being unable to get close enough to see the
  // vertices of a mesh or the voxels of a volume is a bigger one, and these
  // illustrations exist to be looked at closely.
  controls.enableZoom = true;
  controls.minDistance = 1.5;
  controls.maxDistance = 40;

  const bar = document.createElement('div');
  bar.className = 'viz3d-ui';
  el.insertAdjacentElement('afterend', bar);

  const inst = {
    el, canvas, scene, camera, controls, bar,
    renderer: null,
    sizedTo: '',
    failed: false,
    frustumHeight: 4,
    frustumWidth: 0,
    fitRadius: null,
    fittedAspect: 0,
    api: null,
  };

  const ctx = {
    THREE, palette, ramp, scene, camera, controls, el,
    makeLabel, annotate, clearGroup,
    ui: makeUI(bar),
    /**
     * Aim the camera. With `fitRadius`, x/y/z only give the direction and the
     * distance is derived from the box - pass the radius of a sphere that
     * should just fill the frame, which is the object's extent plus a margin.
     */
    view(x, y, z, fitRadius = null, target = [0, 0, 0]) {
      // inst.camera, not the captured `camera`: a scene that has called
      // orthographic() is using a different camera by now, and aiming the one
      // it replaced would silently do nothing.
      inst.camera.position.set(x, y, z);
      controls.target.set(...target);
      inst.fitRadius = fitRadius;
      inst.fittedAspect = 0;
      controls.saveState();
      controls.update();
    },
    /**
     * Change what has to fit in the frame without touching the direction the
     * camera looks from - for scenes that swap between contents of different
     * sizes and must not throw away the rotation the presenter just dialled in.
     */
    refit(fitRadius) {
      inst.fitRadius = fitRadius;
      inst.fittedAspect = 0;
    },

    /**
     * Switch between 'perspective' and 'orthographic', keeping where the
     * camera is looking from. Orthographic is the honest projection whenever
     * a viewer is meant to compare sizes across the scene.
     */
    projection(kind) {
      const next = kind === 'orthographic' ? orthographic : perspective;
      if (next !== inst.camera) {
        next.position.copy(inst.camera.position);
        next.up.copy(inst.camera.up);
        // Carry the layer mask over, so a scene that set up light layers
        // before switching projection does not quietly stop seeing them.
        next.layers.mask = inst.camera.layers.mask;
        inst.camera = next;
        ctx.camera = next;
        controls.object = next;
        inst.fittedAspect = 0;
        controls.update();
      }
      return next;
    },

    /**
     * How much of the world the orthographic camera spans. `height` is the
     * usual constraint; pass `width` too for a scene whose panels must all
     * stay in frame however narrow the box gets.
     */
    frustum(height, width = 0) {
      inst.frustumHeight = height;
      inst.frustumWidth = width;
    },

    /**
     * Take over drawing this scene.
     *
     * `fn(renderer, rect)` is called instead of the usual single render,
     * with the placeholder's rectangle in device pixels. For an
     * illustration that has to be drawn in more than one pass, with more
     * than one camera over sub-rectangles of the same box.
     *
     * No scene uses this. The triptych did, and no longer does.
     */
    onDraw(fn) {
      if (!inst.api) inst.api = {};
      inst.api.draw = fn;
    },
  };

  inst.api = setup(ctx) || inst.api || {};
  if (inst.api.frustumHeight) inst.frustumHeight = inst.api.frustumHeight;

  if (el.dataset.hint !== 'off') {
    const hint = document.createElement('p');
    hint.className = 'viz3d-hint';
    hint.textContent = el.dataset.hint || 'drag to rotate';
    el.appendChild(hint);
  }

  live.push(inst);
  observer.observe(el);
}

function mountPending() {
  for (const [name, setup] of setups) {
    const sel = `.viz3d[data-scene="${name}"]:not([data-viz-mounted])`;
    for (const el of document.querySelectorAll(sel)) {
      el.dataset.vizMounted = '1';
      try {
        mount(el, setup);
      } catch (err) {
        console.error(`viz3d: scene "${name}" failed to mount`, err);
        showFallback(el, SCENE_FAILED);
      }
    }
  }
}

function ensureObserver() {
  if (observer) return;
  observer = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const was = e.target.dataset.vizVisible === '1';
      if (e.isIntersecting === was) continue;
      e.target.dataset.vizVisible = e.isIntersecting ? '1' : '0';
      visibleCount += e.isIntersecting ? 1 : -1;
    }
    if (visibleCount > 0) start(); else stop();
  }, { rootMargin: '100px' });
}

/**
 * Register a scene. Called by every file in scenes/; safe to call before or
 * after the DOM is ready, and mounts into every placeholder using that name.
 */
export function defineScene(name, setup) {
  setups.set(name, setup);
  injectCSS();
  ensureObserver();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountPending, { once: true });
  } else {
    mountPending();
  }
}

// Reveal hides and shows slides without moving anything, so nothing scrolls and
// the observer stays quiet. Re-check on a slide change, and on the view toggle
// between the scrolling page and the deck.
for (const evt of ['slidechanged', 'ready', 'overviewshown', 'overviewhidden']) {
  document.addEventListener(evt, () => { if (visibleCount > 0) start(); });
}
for (const evt of ['resize', 'pageshow', 'focus']) {
  window.addEventListener(evt, () => { if (visibleCount > 0) start(); });
}
