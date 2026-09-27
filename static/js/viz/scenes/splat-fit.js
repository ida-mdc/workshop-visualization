// What "fitting" means: watching a real one happen, at a few splat counts.
//
// The target is a real crop of the sunflower render the luxar slides use -
// the outer ray florets and the drooping bracts behind them, not the whole
// flower. Every splat count in tools/make-splat-fit-demo.py's LEVELS is a
// real, independent fit with luxar's own CUDA pipeline - the same one the
// real sunflower and detail-crop examples use, just against a target small
// enough to sweep several splat counts in a couple of minutes.
//
// Each level is a pre-rendered image, not a live-rendered splat scene: an
// earlier version rebuilt real Gaussian geometry in the browser via Spark
// (github.com/sparkjsdev/spark), which meant re-deriving 2D splat parameters
// from whatever the fit produced on every level change. luxar's own
// `gsplat render` already does that rendering correctly and fast, so this
// just displays its output - the "Fit" panel is a texture, swapped per
// slider position, the same way the "Target" panel always was.
//
// Flat images, so rotating them is not "seeing another side" - it is just
// distortion. Zoom stays on (the whole point is comparing fine structure up
// close); rotate is off.

import { defineScene, THREE, makeLabel } from '../runtime.js';

const DATA = '../../../data/splat-fit.json';
const TARGET_IMG = '../../../img/splat-fit-target.png';
const IMG_BASE = '../../../img/';

const loader = new THREE.TextureLoader();
function loadTex(url) {
  return loader.loadAsync(url).then((tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.magFilter = THREE.NearestFilter; // no interpolation - show the real render
    return tex;
  });
}

async function loadData() {
  const [json, tex] = await Promise.all([
    fetch(new URL(DATA, import.meta.url)).then((r) => r.json()),
    loadTex(new URL(TARGET_IMG, import.meta.url)),
  ]);
  return { json, tex };
}

defineScene('splat-fit', ({ scene, ui, view, controls, projection, frustum }) => {
  controls.enableRotate = false; // flat images: zoom in, do not "turn" them

  // Orthographic, and framed by width and height separately.
  //
  // Two flat panels side by side are a wide, short arrangement, and the
  // perspective fit pulls back far enough for a *sphere* around them - which
  // on a slide, where the box is wider still, left the panels at about half
  // the height they could have had and a lot of black either side. The
  // orthographic path takes whichever of width and height is the tighter
  // constraint, so the panels fill the box in both shapes. A flat image has
  // no perspective to lose by the switch.
  projection('orthographic');

  const gap = 0.35;
  // A makeLabel sprite has sizeAttenuation off, which under a *perspective*
  // camera means "a fraction of the viewport" and under an orthographic one
  // means world units - three.js only multiplies by the view depth when the
  // projection is perspective. So these are world units now, and the label
  // needs a size of its own rather than the 0.11 that used to read as 11%
  // of the box height.
  const LABEL_SCALE = 0.20;
  const LABEL_Y = 1.13;                      // its centre, clear of the panel
  const LABEL_HEAD = LABEL_SCALE / 2 + 0.04; // half a label, plus air

  const backdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.MeshBasicMaterial({ color: '#0b0b10' }),
  );
  backdrop.position.z = -0.05;
  scene.add(backdrop);

  const targetMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ color: '#000000' }),
  );
  const fitMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ color: '#000000' }),
  );
  scene.add(targetMesh, fitMesh);

  const labelTarget = makeLabel('Target', { color: '#dcdce4', scale: LABEL_SCALE });
  const labelFit = makeLabel('Fit', { color: '#dcdce4', scale: LABEL_SCALE });
  scene.add(labelTarget, labelFit);

  const report = ui.readout('Match');

  function layout(a) {
    const w = 2 * a;
    for (const mesh of [targetMesh, fitMesh]) {
      mesh.geometry.dispose();
      mesh.geometry = new THREE.PlaneGeometry(w, 2);
    }
    targetMesh.position.set(-(w / 2 + gap / 2), 0, 0);
    labelTarget.position.set(targetMesh.position.x, LABEL_Y, 0.05);
    fitMesh.position.set(w / 2 + gap / 2, 0, 0);
    labelFit.position.set(fitMesh.position.x, LABEL_Y, 0.05);

    // The frame is the panels plus the strip the labels sit in.
    const top = LABEL_Y + LABEL_HEAD;
    const bottom = -1.04;
    const centre = (top + bottom) / 2;
    frustum(top - bottom, (2 * w + gap) * 1.04);
    view(0, centre, 3.2, null, [0, centre, 0]);
  }

  // Matches tools/make-splat-fit-demo.py's own LEVELS list - the slider is
  // built before the data loads, so it has to know the count up front.
  const LEVEL_COUNT = 7;
  const levels = new Array(LEVEL_COUNT).fill(null);
  const texCache = new Array(LEVEL_COUNT).fill(null); // one promise per level
  const slider = ui.slider('Splats', {
    min: 0, max: LEVEL_COUNT - 1, step: 1, value: 2,
    format: (v) => (levels[v] ? levels[v].n.toLocaleString('en') : '…'),
  }, (v) => rebuild(v));

  let requestId = 0;
  function rebuild(v) {
    const level = levels[v];
    if (!level) return;
    const mine = ++requestId;
    if (!texCache[v]) texCache[v] = loadTex(new URL(IMG_BASE + level.image, import.meta.url));
    texCache[v].then((tex) => {
      if (mine !== requestId) return; // a later drag already moved past this one
      fitMesh.material.map = tex;
      fitMesh.material.color.set('#ffffff');
      fitMesh.material.needsUpdate = true;
      report(`${level.n.toLocaleString('en')} splats`);
    });
  }

  loadData().then(({ json, tex }) => {
    json.levels.forEach((lvl, i) => { levels[i] = lvl; });
    layout(json.aspect);
    targetMesh.material.map = tex;
    targetMesh.material.color.set('#ffffff');
    targetMesh.material.needsUpdate = true;
    slider.set(2);
  });
});
