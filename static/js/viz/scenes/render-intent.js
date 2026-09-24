// One specimen, three jobs, side by side.
//
// Nothing about the data changes across these three panels. What changes is
// who is meant to read the picture - and that is a decision you make, not one
// the renderer makes for you. Worth being explicit about, because the default
// settings of every tool in this workshop encode somebody else's answer.
//
//   Understand  flat shading and a wireframe. Every face the measurement
//               will run on is visible. Ugly on purpose - a working view.
//   Derive      the same specimen with a measured quantity painted onto it -
//               here distance from the centre, per vertex, through a
//               sequential colormap, unlit, inside the box it was acquired
//               in. Nothing here is about how the flower looks; the colour
//               is a number, and numbers are what you compare.
//   Tell        a journal cover: dark set, two coloured lights, glossy
//               tissue. Nothing measurable, and that is fine, because
//               nobody is going to measure it.
//
// No text inside any panel. Labels are sized in world units and the frustum
// moves with the aspect of the box, so they end up either unreadable or
// enormous - the caption strip underneath is HTML and does that job properly.
//
// The three panels are sized to project to the same width, so the triptych
// reads as one comparison rather than three drawings of different sizes.
//
// A triptych rather than a toggle, so the comparison is the slide itself
// rather than something the room has to hold in memory between two clicks.
//
// The three panels share one scene, so the cover's lights would otherwise
// spill onto its neighbours. Light layers stop that: everything in a panel,
// lights included, goes on that panel's layer, and a light only reaches
// objects it shares a layer with. The environment map is not a light and
// ignores layers, so the cover holds it off with envMapIntensity instead.

import {
  defineScene, THREE, palette, ramp, makeLabel, panelStrip, spreadPanels,
} from '../runtime.js';
import * as shape from '../shape.js';

const SPACING = 2.35;
const SCALE = 0.8;

/**
 * The cover card, at the proportions of a journal cover.
 *
 * Portrait, roughly ISO A: that shape is most of what makes the third panel
 * read as a cover rather than as another render, and it is worth more here
 * than matching the width of the box beside it exactly.
 */
const CARD = { w: 2.15, h: 2.84 };

/**
 * A sequential colormap for the derived quantity in the middle panel.
 *
 * Viridis, and recognisably so. A colour-per-part scheme was the obvious
 * thing to draw here and it was wrong: colouring named regions differently is
 * exactly what the cover does too, so the two panels read as the same idea
 * twice. A continuous field does not - it says a number was computed at every
 * point, which is the difference between labelling a thing and measuring it.
 */
const FIELD = ['#440154', '#3b528b', '#21918c', '#5ec962', '#fde725'];

/**
 * Colour every vertex by how far it is from the centre of the flower.
 *
 * Distance stands in for whatever a real analysis produced - thickness,
 * curvature, a concentration, a distance to the nearest vessel. What matters
 * on the slide is that it varies continuously across a surface and came out
 * of a computation rather than out of a decision about how petals look.
 */
function fieldColours(geo) {
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  const distance = new Float32Array(pos.count);
  let far = 0;
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    distance[i] = v.length();
    if (distance[i] > far) far = distance[i];
  }
  const rgb = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const c = ramp(FIELD, distance[i] / far);
    rgb[i * 3] = c.r;
    rgb[i * 3 + 1] = c.g;
    rgb[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(rgb, 3));
  return geo;
}

/**
 * The cover's palette, overriding the specimen's natural tints.
 *
 * The two rings of petals are nearly the same rose in the real tints, so the
 * middle of the flower disappears into the outside of it. On a cover the
 * centre is the thing the eye should land on, so the inner ring and the
 * stamens get their own hues.
 */
const COVER = new Map([
  [shape.TISSUE.petalInner, ['#6d2a63', '#c06bb0']],
  [shape.TISSUE.stamen, ['#e8a012', '#ffe9a0']],
]);
const coverTint = (part) => COVER.get(part.tint) || part.tint;

defineScene('render-intent', (ctx) => {
  const { scene, projection, frustum, view, controls } = ctx;
  // projection() returns the camera that is now active - the one destructured
  // from the context is the perspective camera this replaces, and enabling
  // layers on that one would leave every panel invisible.
  const camera = projection('orthographic');
  frustum(2.8, 7.4);
  view(1.1, 0.75, 4);
  controls.enabled = false;
  for (let i = 1; i <= 3; i++) camera.layers.enable(i);

  panelStrip(ctx.el, ['to understand', 'to derive', 'to tell']);

  const panels = [];
  function panel(x) {
    const g = new THREE.Group();
    g.position.x = x;
    g.scale.setScalar(SCALE);
    scene.add(g);
    panels.push(g);
    return g;
  }

  // --- 1. Understand: a working view --------------------------------------
  const inspect = panel(-SPACING);
  inspect.add(new THREE.Mesh(shape.geometry(22),
    new THREE.MeshStandardMaterial({
      color: '#c6c6d2', roughness: 0.95, metalness: 0, flatShading: true,
      envMapIntensity: 0.5,
    })));
  inspect.add(new THREE.LineSegments(
    new THREE.WireframeGeometry(shape.geometry(8)),
    new THREE.LineBasicMaterial({
      color: palette.dark, transparent: true, opacity: 0.55,
    }),
  ));
  const inspectKey = new THREE.DirectionalLight(0xffffff, 1.1);
  inspectKey.position.set(3, 5, 4);
  inspect.add(inspectKey);

  // --- 2. Derive: the same specimen, labelled -----------------------------
  // Same geometry, one flat colour per tissue, inside the box it was
  // acquired in. What makes this a different job from the one on the left is
  // not the render: it is that every voxel now belongs to a named class, and
  // a class is something you can count, measure and compare between samples.
  const derive = panel(0);
  // Unlit, on purpose. Shading makes a colour lighter in one place than
  // another, and when the colour is the value that is a lie - the reader
  // cannot tell the light from the data. Every tool that plots a field on a
  // surface offers exactly this, for exactly this reason.
  derive.add(new THREE.Mesh(fieldColours(shape.geometry(48)),
    new THREE.MeshBasicMaterial({ vertexColors: true })));

  const B = shape.BOUNDS;
  derive.add(new THREE.LineSegments(
    new THREE.EdgesGeometry(
      new THREE.BoxGeometry(2 * B.x, 2 * B.y, 2 * B.z)),
    new THREE.LineBasicMaterial({
      color: palette.teal, transparent: true, opacity: 0.4,
    }),
  ));

  // --- 3. Tell: a journal cover -------------------------------------------
  const publish = panel(SPACING);

  // The dark set. Square to the camera rather than to the world, so it reads
  // as the edge of a printed page instead of a wall standing in the scene.
  const card = new THREE.Mesh(
    new THREE.PlaneGeometry(CARD.w, CARD.h),
    new THREE.MeshBasicMaterial({ color: '#12131b' }),
  );
  card.quaternion.copy(camera.quaternion);
  card.position.copy(camera.position).normalize().multiplyScalar(-2.6);
  publish.add(card);

  // Narrower than the card, or the pool of light spills off the page and the
  // cover stops looking like a printed thing.
  const pool = new THREE.Mesh(
    new THREE.CircleGeometry(0.92, 48),
    new THREE.MeshBasicMaterial({
      color: '#343a55', transparent: true, opacity: 0.55,
    }),
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = -0.98;
  publish.add(pool);

  publish.add(new THREE.Mesh(shape.geometry(56, 0, coverTint),
    new THREE.MeshPhysicalMaterial({
      vertexColors: true, roughness: 0.26, metalness: 0.04,
      clearcoat: 0.6, clearcoatRoughness: 0.35, envMapIntensity: 0.12,
    })));

  const warm = new THREE.PointLight('#ffcf9e', 26, 9, 2);
  warm.position.set(-1.7, 1.9, 1.5);
  publish.add(warm);
  const cool = new THREE.PointLight('#87c3ff', 15, 8, 2);
  cool.position.set(1.8, -0.3, 1.7);
  publish.add(cool);
  const kicker = new THREE.PointLight('#ffffff', 11, 7, 2);
  kicker.position.set(0.2, 1.5, -1.6);
  publish.add(kicker);

  const title = makeLabel('FLORAL MORPHOLOGY', {
    color: '#f2f2f7', size: 13, weight: 700, scale: 0.21,
  });
  title.position.set(0, 1.02, 0.9);
  title.center.set(0.5, 0.5);
  publish.add(title);
  const issue = makeLabel('Vol 12 · Issue 4', {
    color: '#c9a888', size: 10, weight: 500, scale: 0.16,
  });
  issue.position.set(0, 0.86, 0.9);
  issue.center.set(0.5, 0.5);
  publish.add(issue);

  // --- the left panel turns -----------------------------------------------
  // "To understand" is the one job here you cannot do from a still picture:
  // you pick the thing up and turn it over. Orbiting the camera would turn
  // all three panels at once, and the cover is composed for one viewpoint -
  // so the drag rotates the first panel's own group, and only when it starts
  // inside that panel.
  const drag = { on: false, x: 0, y: 0 };
  const startsInFirstPanel = (ev) => {
    const r = ctx.el.getBoundingClientRect();
    return ev.clientX - r.left < r.width / panels.length;
  };
  ctx.el.addEventListener('pointerdown', (ev) => {
    if (!startsInFirstPanel(ev)) return;
    drag.on = true;
    drag.x = ev.clientX;
    drag.y = ev.clientY;
    ctx.el.setPointerCapture(ev.pointerId);
  });
  ctx.el.addEventListener('pointermove', (ev) => {
    if (!drag.on) return;
    inspect.rotation.y += (ev.clientX - drag.x) * 0.01;
    // Clamped, because tipping past the poles turns the specimen upside down
    // and there is no horizon here to tell you that it has.
    inspect.rotation.x = THREE.MathUtils.clamp(
      inspect.rotation.x + (ev.clientY - drag.y) * 0.01, -0.9, 0.9,
    );
    drag.x = ev.clientX;
    drag.y = ev.clientY;
  });
  for (const evt of ['pointerup', 'pointercancel', 'pointerleave']) {
    ctx.el.addEventListener(evt, (ev) => {
      if (!drag.on) return;
      drag.on = false;
      if (ctx.el.hasPointerCapture?.(ev.pointerId)) {
        ctx.el.releasePointerCapture(ev.pointerId);
      }
    });
  }

  // Layers last, once each panel is fully populated: Object3D.layers is
  // per-object and a group does not pass it down to children added later.
  panels.forEach((g, i) => g.traverse((o) => o.layers.set(i + 1)));

  return { tick: () => spreadPanels(camera, panels) };
});
