// Mermaid, configured for a slide deck and made to survive the slide view.
//
// This file owns mermaid entirely. The theme's baseof.html starts it with
// `startOnLoad: true` when a page sets the `hasMermaid` store flag - our
// render hook deliberately does not set it, because a second
// mermaid.initialize() would replace the config below rather than merge into
// it, and whichever ran last would win.
//
// Two things the default configuration gets wrong for a deck:
//
//   useMaxWidth puts an inline `max-width: <natural>px` on the SVG. Off, so
//   that slides.css decides - and what it decides is "natural size, shrink
//   only to fit". Stretching a diagram to the column width scales its text
//   with it, which gives every flowchart a different font size depending on
//   how many nodes it happens to have.
//
//   fontSize is therefore the one knob, and it is set once here for every
//   diagram in the deck. Spacing is tightened from the document defaults so
//   that a chart at this font size still fits across a slide.
//
// And the reason this file existed in the first place: Reveal is loaded
// dynamically and, until it has initialised, reveal.css has every slide at
// `display: none`. Mermaid sizes its nodes by measuring rendered text,
// measuring inside a display:none subtree gives zero for everything, and the
// diagram collapses to an empty 16x16 SVG - a slide that comes up blank, which
// is only discovered when presenting. So: keep each diagram's source, and
// re-render any that turns out to have collapsed at the moment its slide
// actually comes on screen. Lazily, because a slide that is not the current
// one is still display:none and would collapse all over again.

const MERMAID = 'https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.esm.min.mjs';

/**
 * Mermaid's settings, sized to the page it is drawn on.
 *
 * The deck sets its body text in vw - 38px on a 1920 projector - while the
 * scrolling page is about half that. Mermaid bakes a fixed pixel font into
 * the SVG at render time, so a single number cannot serve both: at the
 * scroll size the diagrams look tiny in the deck, which is exactly what they
 * did. Measuring the text next to them and matching it is the only way to
 * have the two agree.
 *
 * Everything else is expressed in multiples of that font, so the layout
 * keeps its proportions at either size.
 */
/**
 * The size the deck's diagrams are drawn at, and the size the wrap widths
 * in the markdown are written for. See buildConfig.
 */
const REFERENCE_FONT = 26;

/** What buildConfig settled on, for fitWrapping to scale against. */
let fontSize = REFERENCE_FONT;

/**
 * Rescale a diagram's own `wrappingWidth` to the font it is about to be
 * drawn at.
 *
 * A diagram that needs a hand fitting says so in its own frontmatter, in
 * pixels - but pixels only mean something next to a font size, and the
 * page draws at 16px where the deck draws at 26. Left alone, a wrap width
 * chosen so the pipeline fits a slide stops wrapping anything at all on
 * the page, the diagram comes out half as wide again as the column, and
 * the browser scales the whole SVG down - so the one diagram that needed
 * help is the one that ends up with the smallest type on the page.
 *
 * Scaling the number with the font keeps the shape the author chose and
 * lets it fit both places.
 */
function fitWrapping(text) {
  const k = fontSize / REFERENCE_FONT;
  if (Math.abs(k - 1) < 0.001) return text;
  return text.replace(/(wrappingWidth:[ \t]*)(\d+(?:\.\d+)?)/g,
    (_, head, n) => head + Math.round(Number(n) * k));
}

function buildConfig() {
  const probe = document.querySelector('.reveal .slides section')
    || document.querySelector('main')
    || document.body;
  const measured = parseFloat(getComputedStyle(probe).fontSize);
  const read = Number.isFinite(measured) && measured > 0 ? measured : 16;
  // Capped, and the cap is what makes the deck's diagrams match each other.
  //
  // Matching the slide font sounds right and is not achievable: at 38px the
  // widest flowchart in the deck is 1891px across and over 800 tall, which
  // is past both the slide and the max-height above, so the browser scales
  // that SVG down - and a scaled SVG has smaller text than an unscaled one
  // beside it. The diagrams then disagree with each other, which reads far
  // worse than all of them being a size below the prose.
  //
  // REFERENCE_FONT is the largest size at which the biggest of them still
  // fits unscaled. Under it nothing is scaled and every diagram is the
  // same. On the scrolling page the measured font is smaller than the
  // ceiling anyway, so this only bites in the deck.
  fontSize = Math.min(read, REFERENCE_FONT);
  const font = fontSize;
  return {
    startOnLoad: false,
    securityLevel: 'loose',
    fontFamily: 'Urbanist, Helvetica, sans-serif',
    themeVariables: { fontSize: `${font}px` },
    flowchart: {
      useMaxWidth: false,
      htmlLabels: true,
      nodeSpacing: Math.round(font * 1.4),
      rankSpacing: Math.round(font * 2.3),
      padding: Math.round(font * 0.45),
      curve: 'basis',
      // How wide a label may get before it wraps. Generous, because the
      // default breaks at about 120px and turns "Fixed size, scripted,
      // orthographic" into three stacked lines in a tall narrow box.
      wrappingWidth: Math.round(font * 16),
    },
  };
}

// Module scripts are deferred, so the whole document is parsed by now and this
// sees every diagram on the page - not only the one whose code block asked for
// this file. Running twice is harmless; the second copy finds no sources left.
const sources = new WeakMap();
for (const el of document.querySelectorAll('.mermaid')) {
  if (!sources.has(el)) sources.set(el, el.textContent);
}

/** A diagram that rendered to nothing, or has not rendered at all. */
function collapsed(el) {
  const svg = el.querySelector('svg');
  return !svg || svg.getBoundingClientRect().width < 40;
}

/**
 * Leave exactly one drawing per diagram.
 *
 * Re-rendering a diagram can leave the previous SVG behind - two drawings in
 * one container, the second of them sized `width="100%"` with no height, so
 * it collapses and the next diagram on the page overlaps it. Keeping the last
 * one is right: it is the most recent render, and the one measured against
 * the layout the reader is actually looking at.
 */
function dropDuplicates(root) {
  const sized = (svg) => /^[\d.]+$/.test(svg.getAttribute('height') || '');
  for (const el of (root || document).querySelectorAll('.mermaid')) {
    const svgs = [...el.querySelectorAll(':scope > svg')];
    if (!svgs.length) continue;
    // Keep the one with a diagram inside it.
    //
    // Height used to be the test - the finished render carries a pixel
    // height and the stray is `width="100%"` with none. That fails when
    // the finished one has no height either: `find` returns nothing, the
    // fallback keeps the LAST svg, and the last one is the stray, so the
    // real diagram was deleted and a 100%-wide box holding one <style>
    // rule was left in its place. On the page that happened to two of the
    // four, which is why they came out as a strip of tiny type.
    const drawn = (svg) => !!svg.querySelector('g.root, g.nodes, .node');
    const real = svgs.find(drawn) || svgs.find(sized) || svgs[svgs.length - 1];
    for (const svg of svgs) if (svg !== real) svg.remove();
    if (!sized(real)) {
      // No height anywhere: take it off the viewBox rather than leave the
      // container to collapse.
      const box = (real.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
      if (box.length === 4 && box[3] > 0) {
        real.setAttribute('width', box[2]);
        real.setAttribute('height', box[3]);
      }
    }
  }
}

/**
 * Undo mermaid's stretching of image nodes.
 *
 * An `A@{ img: ... }` node is drawn as an SVG <image> with
 * preserveAspectRatio="none" and the *node's* width - which for a node whose
 * label is wider than its icon means a square icon smeared across 120px. The
 * requested w/h are not honoured, and there is no configuration for it, so
 * the attribute is corrected once the diagram exists. "meet" scales the icon
 * to fit and centres it, leaving the extra width empty.
 */
function unstretchImages(root) {
  for (const img of (root || document).querySelectorAll('.mermaid image')) {
    img.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  }
}

/**
 * Aim edges at the picture, not at the picture plus its caption.
 *
 * An `A@{ img: ... }` node is an image with a text label under it, and
 * mermaid treats the two together as the node box - so an edge arrives at
 * the centre of image-plus-caption, which is visibly below the middle of the
 * image. With a row of them the arrows all sag.
 *
 * There is no layout option for this, so the endpoints are moved afterwards:
 * every edge is named L_<source>_<target>_<n>, and every node carries its id,
 * which is enough to find the two images and pull the first and last point of
 * the path onto their vertical centres. Only y moves - mermaid's horizontal
 * routing is already right.
 */
function centreEdges(root) {
  for (const svg of (root || document).querySelectorAll('.mermaid svg')) {
    const middle = new Map();
    for (const node of svg.querySelectorAll('g.node')) {
      const img = node.querySelector('image');
      if (!img || !node.id) continue;
      // id is like "<diagram>-flowchart-M-3"; the node's own name is the
      // second to last field.
      const parts = node.id.split('-');
      const name = parts[parts.length - 2];
      const ctm = img.getCTM();
      if (!ctm) continue;
      const cy = +img.getAttribute('y') + (+img.getAttribute('height')) / 2;
      const cx = +img.getAttribute('x') + (+img.getAttribute('width')) / 2;
      const pt = svg.createSVGPoint();
      pt.x = cx;
      pt.y = cy;
      middle.set(name, pt.matrixTransform(ctm).y);
    }

    for (const path of svg.querySelectorAll('path[id^="L_"]')) {
      const m = /^L_(.+)_(.+)_\d+$/.exec(path.id);
      if (!m) continue;
      const from = middle.get(m[1]);
      const to = middle.get(m[2]);
      if (from === undefined && to === undefined) continue;
      const d = path.getAttribute('d');
      // "M x,y L x,y ..." - only the very first and very last pair move.
      const nums = [...d.matchAll(/-?\d+(?:\.\d+)?/g)];
      if (nums.length < 4) continue;
      const set = (index, value) => {
        const hit = nums[index];
        nums[index] = { 0: hit[0], index: hit.index, replacement: String(value) };
      };
      if (from !== undefined) set(1, from);
      if (to !== undefined) set(nums.length - 1, to);
      let out = '';
      let cursor = 0;
      for (const n of nums) {
        if (n.replacement === undefined) continue;
        out += d.slice(cursor, n.index) + n.replacement;
        cursor = n.index + n[0].length;
      }
      path.setAttribute('d', out + d.slice(cursor));
    }
  }
}

let mermaidModule = null;

async function load() {
  if (!mermaidModule) {
    // Before anything is measured. Mermaid sizes every node by rendering its
    // label and reading the box back, so if the webfont lands after that the
    // boxes are the wrong size for the text now inside them and the labels
    // come out clipped. The deck's heading font is a Google font, i.e. always
    // a network round trip later than the script that draws with it.
    await document.fonts?.ready;
    mermaidModule = (await import(MERMAID)).default;
    mermaidModule.initialize(buildConfig());
  }
  return mermaidModule;
}

/**
 * Draw every diagram under `root` that has not been drawn yet.
 *
 * Nothing is ever rendered while it is hidden. Mermaid measures a node by
 * laying its label out and reading the box back, and reveal.css keeps every
 * slide except the current one at `display: none` - so a diagram rendered on
 * a hidden slide measures to zero and collapses to an empty 16x16 SVG. The
 * old approach was to render everything up front and then repair whatever
 * had collapsed, which meant each diagram was drawn at least twice and the
 * repair had to win a race it did not always win.
 *
 * So: render on demand. The scrolling page draws everything once, because
 * everything is visible. The deck draws the slide in front of you, and each
 * new slide as you reach it.
 */
let inFlight = Promise.resolve();

/** Ids have to be unique per render, and mermaid does not mind which. */
let serial = 0;

/**
 * Wait for every icon a diagram references.
 *
 * A node written `A@{ img: "...svg" }` is laid out around the picture, and
 * mermaid measures that picture synchronously - so on a cold cache it
 * measures an image that has not arrived and throws
 * `Cannot read properties of null`. The diagram then stays as its own
 * source text in the middle of the slide. It is a race, so it came and
 * went with cache state and looked like whatever had been edited last.
 */
function preloadIcons(text) {
  const urls = [...text.matchAll(/img:\s*"([^"]+)"/g)].map((m) => m[1]);
  return Promise.all(urls.map((url) => new Promise((done) => {
    const img = new Image();
    // Resolve either way: a missing icon should cost us that icon, not the
    // whole diagram.
    img.onload = done;
    img.onerror = done;
    img.src = url;
  })));
}

async function render(root) {
  // `.catch` and not `await`: a rejected inFlight used to throw right here
  // on the next call and take every later render down with it, so one
  // unlucky first paint left the rest of the deck showing mermaid source.
  await inFlight.catch(() => {});
  const scope = root || document;
  const pending = [...scope.querySelectorAll('.mermaid')]
    .filter((el) => sources.has(el) && collapsed(el) && el.offsetParent !== null);
  if (!pending.length) return;

  const mermaid = await load();

  // `mermaid.render` rather than `mermaid.run`.
  //
  // `run` takes the nodes and manages their contents itself, and it only
  // gets that right the first time it sees one: on any later pass over the
  // same container it leaves an empty stub behind - an svg with
  // `width="100%"`, no height and no diagram inside. In the deck that was
  // invisible, because each slide is rendered once when it comes up. On
  // the page every diagram is rendered together and then again on
  // `pageshow`, so the second pass quietly replaced finished diagrams with
  // stubs and they came out as a thin strip of nothing.
  //
  // `render` just returns the markup for a string, leaving where it goes
  // to us. One svg in, one svg out, however many times it runs.
  for (const el of pending) {
    const text = fitWrapping(sources.get(el));
    // eslint-disable-next-line no-await-in-loop
    await preloadIcons(text);
    inFlight = mermaid.render(`mermaid-slides-${serial++}`, text)
      .then(({ svg, bindFunctions }) => {
        el.innerHTML = svg;
        el.removeAttribute('data-processed');
        bindFunctions?.(el);
      });
    // eslint-disable-next-line no-await-in-loop
    await inFlight.catch((e) => {
      console.warn('mermaid-slides: render failed, will retry', e);
    });
  }

  dropDuplicates(scope);
  unstretchImages(scope);
  centreEdges(scope);
}

/** The slide on screen, or the whole page when there is no deck. */
const onScreen = () => document.querySelector('section.present') || document;

const deck = () => !!document.querySelector('.reveal .slides');

(async () => {
  await load();
  if (!deck()) {
    await render(document);
    return;
  }
  // Reveal may or may not have initialised by now, and its `ready` may
  // already have gone past. Try immediately and once more after it has had
  // a chance to lay out; both are cheap, because a diagram that is already
  // drawn is skipped.
  await render(onScreen());
  setTimeout(() => render(onScreen()), 400);
})();

// Reveal's events bubble from its wrapper up to the document.
for (const evt of ['ready', 'slidechanged', 'overviewshown', 'overviewhidden']) {
  document.addEventListener(evt, () => render(onScreen()));
}
// Leaving the deck for the scrolling page shows everything at once.
window.addEventListener('pageshow', () => render(deck() ? onScreen() : document));
