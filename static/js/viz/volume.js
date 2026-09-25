// The volume renderer: one ray marcher, four things to do with the samples.
//
// The assembled dataset in panel 3 used to be drawn as thousands of little
// cubes, which is a lie about what a volume is: it says the data is a pile of
// blocks with faces and gaps, when it is a sampled field. It also composites
// badly - translucent cubes stack into fog - and it costs an instance per
// voxel.
//
// So the data goes to the GPU as one 3D texture and a ray is marched through
// it per pixel, front to back, accumulating color and opacity through a
// transfer function. That is what every volume viewer the audience will
// actually use does, which makes this the honest picture as well as the
// cheaper one.
//
// The transfer function is built on the CPU as a 256-entry lookup and
// uploaded as a texture, again because that is how real viewers do it: the
// curve is data you can edit and report, not code.
//
// `mode` picks what happens to the samples a ray collects, which is the only
// thing that separates the four pictures a volume viewer can show you. The
// acquisition panels only ever want emission-absorption; the voxels session
// switches between all four, and that switch is its whole point.
//
// There used to be a second copy of this shader living in the voxels scene,
// with its own box intersection, its own gradient and its own transfer
// function. Two ray marchers meant a fix to one never reached the other, so
// the modes moved here instead.

import { THREE, ramp } from './runtime.js';

/**
 * What to do with the samples along a ray.
 *
 *   Slice        one sample, on one plane. Nothing hidden, nothing inferred.
 *   MIP          the brightest sample along the ray. Great for sparse bright
 *                structures, and it destroys depth order completely.
 *   Emission     accumulate color and opacity front to back. What people
 *                mean by "volume rendering", and what the transfer function
 *                governs entirely.
 *   Isosurface   stop at the first sample over the threshold and shade it -
 *                a surface, without ever building a mesh.
 */
export const MODES = {
  Slice: 0,
  MIP: 1,
  'Emission-absorption': 2,
  Isosurface: 3,
};

const VERT = /* glsl */`
  uniform vec3 viewDir;          // world space, the way the camera looks
  uniform float orthographic;

  out vec3 vOrigin;
  out vec3 vDirection;

  void main() {
    mat4 inv = inverse(modelMatrix);

    // Both forms of camera have to be handled, and getting this wrong is not
    // subtle: under an orthographic camera every ray is parallel, so there
    // is no eye point to shoot from. Using the camera's position anyway
    // makes the rays converge on it, and a box sitting off to one side of
    // the view axis then gets sampled at a grazing angle - which renders as
    // the data smeared flat across the box faces rather than as a volume.
    if (orthographic > 0.5) {
      vec3 d = normalize((inv * vec4(viewDir, 0.0)).xyz);
      vDirection = d;
      vOrigin = position - d * 4.0;     // start well outside the unit box
    } else {
      vOrigin = (inv * vec4(cameraPosition, 1.0)).xyz;
      vDirection = position - vOrigin;
    }

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = /* glsl */`
  precision highp float;
  precision highp sampler3D;

  in vec3 vOrigin;
  in vec3 vDirection;
  out vec4 outColor;

  #define MODE_SLICE 0
  #define MODE_MIP 1
  #define MODE_EMISSION 2
  #define MODE_ISO 3

  uniform sampler3D volume;
  uniform sampler2D transfer;
  uniform float steps;
  uniform vec3 voxel;        // one voxel, in texture coordinates
  uniform float shade;       // how much gradient lighting to apply
  uniform float edge;        // how much to favour boundaries over interiors
  uniform float ambient;

  uniform int mode;
  uniform float slice;       // depth along the view axis, for MODE_SLICE
  uniform float threshold;   // the level MODE_ISO stops at
  uniform vec3 isoColor;

  // An optional plane that lights up inside the volume - the slice the
  // instrument is acquiring right now.
  uniform float glowY;
  uniform float glowWidth;
  uniform float glowStrength;
  uniform vec3 glowColor;

  vec2 hitBox(vec3 orig, vec3 dir) {
    vec3 invDir = 1.0 / dir;
    vec3 a = (vec3(-0.5) - orig) * invDir;
    vec3 b = (vec3(0.5) - orig) * invDir;
    vec3 tmin = min(a, b);
    vec3 tmax = max(a, b);
    return vec2(max(tmin.x, max(tmin.y, tmin.z)),
                min(tmax.x, min(tmax.y, tmax.z)));
  }

  float sampleAt(vec3 p) { return texture(volume, p + 0.5).r; }

  // Central differences one voxel apart. The gradient of a scalar field is
  // the closest thing a volume has to a surface normal, and it is what makes
  // the difference between a lit object and a colored smudge.
  vec3 gradient(vec3 p) {
    return vec3(
      sampleAt(p + vec3(voxel.x, 0.0, 0.0)) - sampleAt(p - vec3(voxel.x, 0.0, 0.0)),
      sampleAt(p + vec3(0.0, voxel.y, 0.0)) - sampleAt(p - vec3(0.0, voxel.y, 0.0)),
      sampleAt(p + vec3(0.0, 0.0, voxel.z)) - sampleAt(p - vec3(0.0, 0.0, voxel.z)));
  }

  void main() {
    vec3 dir = normalize(vDirection);
    vec2 span = hitBox(vOrigin, dir);
    if (span.x > span.y) discard;
    span.x = max(span.x, 0.0);

    float dt = (span.y - span.x) / steps;
    vec3 p = vOrigin + span.x * dir;
    vec3 stride = dir * dt;

    if (mode == MODE_SLICE) {
      // A plane perpendicular to the view, not to an axis of the volume. Fix
      // it to the volume's z and turning the object turns a picture of one
      // slice, edge-on at ninety degrees; fix it to the view and turning
      // cuts a new plane, which is what re-slicing a volume means and what
      // every viewer's slice control actually does.
      float t = slice - dot(vOrigin, dir);
      if (t < span.x || t > span.y) discard;
      vec3 q = vOrigin + t * dir;
      if (abs(q.x) > 0.5 || abs(q.y) > 0.5 || abs(q.z) > 0.5) discard;
      outColor = vec4(texture(transfer, vec2(sampleAt(q), 0.5)).rgb, 1.0);
      return;
    }

    // Start each ray a random fraction of a step in.
    //
    // Without this, every ray in the picture takes its samples on the same
    // set of planes, and the surface a transfer function draws can only ever
    // land on one of them. The error is the same for neighbouring pixels, so
    // it does not look like noise - it looks like contour lines, and a head
    // rendered this way comes out with the grain of a wood carving. People
    // read those rings as anatomy, which is worse than an ugly picture.
    //
    // Breaking the alignment per pixel spends the same error on high
    // frequency detail instead, where the eye reads it as surface texture.
    // Every production volume renderer does this.
    //
    // Only the slice is left alone, because it takes one sample at a place
    // the viewer chose and there is nothing to align. The other three all
    // band, maximum intensity included - it misses the same peak in the same
    // way for a whole run of neighbouring pixels.
    float jitter = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)))
                         * 43758.5453);
    p += stride * jitter;

    if (mode == MODE_MIP) {
      float peak = 0.0;
      for (float i = 0.0; i < steps; i += 1.0) {
        peak = max(peak, sampleAt(p));
        p += stride;
      }
      vec4 c = texture(transfer, vec2(peak, 0.5));
      // Color from the peak, but opacity still from the ramp, so the picture
      // fades out where a ray found nothing but noise.
      if (c.a <= 0.01) discard;
      outColor = vec4(c.rgb, 1.0);
      return;
    }

    if (mode == MODE_ISO) {
      for (float i = 0.0; i < steps; i += 1.0) {
        if (sampleAt(p) >= threshold) {
          // The gradient points into denser material, so the outward normal
          // is its negation - the same convention the shading below uses.
          vec3 n = -normalize(gradient(p) + 1e-6);
          float lit = 0.32 + 0.68
            * max(0.0, dot(n, normalize(vec3(0.6, 0.8, 0.5))));
          // A surface color, not a transfer-function color: the transfer
          // curve is tuned for accumulating along a ray, and its value at the
          // threshold is usually near-black - which would render the
          // isosurface as a silhouette.
          outColor = vec4(isoColor * lit, 1.0);
          return;
        }
        p += stride;
      }
      discard;
    }

    // Lighting is set up relative to the viewer, in the volume's own space,
    // so it stays put when the panel is spun: a key just above and left of
    // the camera, plus the camera itself as a fill.
    vec3 toEye = -dir;
    vec3 key = normalize(toEye + vec3(0.55, 0.85, 0.15));
    vec3 halfway = normalize(key + toEye);

    vec4 acc = vec4(0.0);
    for (float i = 0.0; i < steps; i += 1.0) {
      float v = sampleAt(p);
      vec4 c = texture(transfer, vec2(v, 0.5));

      // The gradient costs six more texture fetches per step, so it is only
      // worth taking when something is going to read it. The voxels scene
      // runs this mode unlit, and paying for it there would make the one
      // picture people compare the other three against the slowest.
      if (c.a > 0.0005 && (shade > 0.0 || edge > 0.0)) {
        vec3 g = gradient(p);
        float len = length(g);
        // Where the field is flat the gradient is noise, so both the shading
        // and the boundary emphasis fade out with it.
        float w = clamp(len * 6.0, 0.0, 1.0);

        if (shade > 0.0) {
          vec3 n = -g / max(len, 1e-5);
          float diffuse = max(dot(n, key), 0.0);
          float spec = pow(max(dot(n, halfway), 0.0), 26.0);
          vec3 lit = c.rgb * (ambient + (1.0 - ambient) * diffuse)
                   + vec3(0.28) * spec;
          c.rgb = mix(c.rgb, lit, w * shade);
        }

        // Boundaries scatter; the inside of a uniform blob does not. Leaning
        // on that is what stops a solid region rendering as a flat slab.
        c.a *= mix(1.0, w, edge);
      }

      float a = c.a * (1.0 - acc.a);
      acc.rgb += c.rgb * a;
      acc.a += a;

      if (glowStrength > 0.0) {
        // Mostly light, barely any opacity: the plane being acquired should
        // glow through the data rather than draw a curtain across it.
        float d = (p.y - glowY) / glowWidth;
        float g2 = exp(-d * d) * glowStrength * (1.0 - acc.a);
        acc.rgb += glowColor * g2 * (0.35 + 0.65 * v);
        acc.a += g2 * 0.10;
      }

      if (acc.a > 0.985) break;
      p += stride;
    }
    if (acc.a < 0.004) discard;
    outColor = acc;
  }
`;

/**
 * The transfer function: color from a ramp, opacity from a curve.
 *
 * Two ways to give the opacity. `points` is a list of [value, alpha] anchors
 * interpolated linearly between - what VTK calls a piecewise function and
 * what every transfer function editor draws as draggable handles. Without it
 * you get the simple version: one soft shoulder at `threshold`.
 *
 * A hard step aliases badly along a ray, so the shoulder has a width - which
 * is why every viewer's opacity ramp has one too.
 *
 * `density` is the opacity of ONE sample, not of the material, and a ray
 * takes a hundred and fifty of them. So the useful range is a few percent:
 * to end up around 90 percent opaque through solid material at 150 steps,
 * one sample needs about 0.015. Anything near 0.3 makes every ray saturate
 * on the first few samples and the volume renders as a painted box.
 *
 * `curve` then decides how fast faint values give up their opacity. Raising
 * it is what keeps background noise as a haze instead of a wall, which is
 * the whole difference between seeing the specimen inside its volume and
 * seeing the volume.
 *
 * `window` is the radiologist's window and level, and it applies to the
 * COLOR only. A stained micro-CT puts air at zero and soft tissue between
 * about 0.1 and 0.5, with bone above that and nothing much in the top third -
 * so a ramp spread evenly over 0 to 1 spends most of itself on values the
 * specimen does not contain, and renders a frog as a dark smudge. Windowing
 * to the range that is actually occupied is what every CT viewer does before
 * it shows you anything.
 *
 * Opacity is deliberately NOT windowed. Thresholds and anchor points in this
 * deck are quoted in data units, they are compared against numbers in
 * scan.js, and a window that silently moved them would make every one of
 * those numbers a lie.
 */
function piecewise(points, v) {
  if (v <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i];
    if (v <= x1) {
      const [x0, y0] = points[i - 1];
      const t = x1 === x0 ? 1 : (v - x0) / (x1 - x0);
      return y0 + (y1 - y0) * t;
    }
  }
  return points[points.length - 1][1];
}

export function transferLUT(stops, {
  threshold = 0.2, width = 0.08, density = 0.05, curve = 2.5, points = null,
  window = null,
} = {}) {
  const N = 256;
  const data = new Uint8Array(N * 4);
  const [wlo, whi] = window || [0, 1];
  const span = Math.max(whi - wlo, 1e-6);
  for (let i = 0; i < N; i++) {
    const v = i / (N - 1);
    const c = ramp(stops, Math.min(1, Math.max(0, (v - wlo) / span)));
    // With anchor points the opacity is read straight off the curve, which is
    // the only way to say "show this band and not the brighter one" - a single
    // rising shoulder can never hide something above what it shows.
    const a = points
      ? piecewise(points, v)
      : (() => {
        const t = Math.min(1, Math.max(0, (v - (threshold - width)) / (2 * width)));
        return (t * t * (3 - 2 * t)) ** curve;
      })();
    data[i * 4] = Math.round(c.r * 255);
    data[i * 4 + 1] = Math.round(c.g * 255);
    data[i * 4 + 2] = Math.round(c.b * 255);
    data[i * 4 + 3] = Math.round((points ? a : a * density) * 255);
  }
  return data;
}

/**
 * The same lookup, as a texture for the shader.
 *
 * Split from transferLUT so that a scene drawing the curve for the reader and
 * the shader sampling it are looking at the same 256 numbers - a transfer
 * function plotted from a second implementation is a plot of something else.
 *
 * `opts.lut` hands over a finished 256-entry RGBA table instead, for the one
 * case a ramp cannot express: a label field, where value 7 is object 7 and
 * has no business being a shade between object 6 and object 8. Such a table
 * is sampled with a nearest filter for the same reason.
 */
export function transferTexture(stops, opts = {}) {
  const data = opts.lut || transferLUT(stops, opts);
  const tex = new THREE.DataTexture(data, data.length / 4, 1);
  const filter = opts.lut ? THREE.NearestFilter : THREE.LinearFilter;
  tex.minFilter = filter;
  tex.magFilter = filter;
  tex.needsUpdate = true;
  return tex;
}

/**
 * A ray-marched volume filling `bounds`, ready to be handed new data.
 *
 * `shape` is [nx, ny, nz]; the data is a Uint8Array laid out x fastest, then
 * y, then z, which is what a 3D texture wants.
 */
export function makeVolume(parent, {
  shape, bounds, stops, threshold = 0.2, width = 0.08, density = 0.05,
  curve = 2.5, points = null, window = null, lut = null, steps = 150,
  shade = 1, edge = 0, ambient = 0.22, interpolate = true,
  mode = MODES['Emission-absorption'], slice = 0, isoColor = '#ffffff',
  texture: shared = null,
}) {
  const [nx, ny, nz] = shape;
  const [bx, by, bz] = bounds;

  // `shared` lets several panels show one dataset four ways without uploading
  // it four times - which for the 1.8 MB head would be 7 MB of texture and
  // four decodes for four pictures of the same numbers.
  const data = shared ? shared.image.data : new Uint8Array(nx * ny * nz);
  const texture = shared || new THREE.Data3DTexture(data, nx, ny, nz);
  if (!shared) {
    texture.format = THREE.RedFormat;
    texture.type = THREE.UnsignedByteType;
    // Linear by default. Nearest shows the sampling grid honestly, but it
    // also makes the gradient stair-step, and without a usable gradient
    // there is no lighting and the volume renders as a colored smudge. The
    // voxel-grid scene is where the lattice gets shown; here the job is to
    // look like a volume viewer.
    const filter = interpolate ? THREE.LinearFilter : THREE.NearestFilter;
    texture.minFilter = filter;
    texture.magFilter = filter;
    texture.unpackAlignment = 1;
    texture.needsUpdate = true;
  }

  const uniforms = {
    volume: { value: texture },
    transfer: {
      value: transferTexture(stops, {
        threshold, width, density, curve, points, window, lut,
      }),
    },
    steps: { value: steps },
    viewDir: { value: new THREE.Vector3(0, 0, -1) },
    orthographic: { value: 0 },
    voxel: { value: new THREE.Vector3(1 / nx, 1 / ny, 1 / nz) },
    shade: { value: shade },
    edge: { value: edge },
    ambient: { value: ambient },
    mode: { value: mode },
    slice: { value: slice },
    threshold: { value: threshold },
    isoColor: { value: new THREE.Color(isoColor) },
    glowY: { value: 0 },
    glowWidth: { value: 0.02 },
    glowStrength: { value: 0 },
    glowColor: { value: new THREE.Color('#f6d29a') },
  };

  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERT,
      fragmentShader: FRAG,
      glslVersion: THREE.GLSL3,
      side: THREE.BackSide,       // march from where the ray leaves the box
      transparent: true,
      depthWrite: false,
    }),
  );
  mesh.scale.set(2 * bx, 2 * by, 2 * bz);
  // The camera is whatever the scene is using by the time this draws, and
  // the triptych swaps in an orthographic one, so the ray setup is decided
  // per frame rather than assumed.
  mesh.onBeforeRender = (renderer, scene, camera) => {
    uniforms.orthographic.value = camera.isOrthographicCamera ? 1 : 0;
    camera.getWorldDirection(uniforms.viewDir.value);
  };
  parent.add(mesh);

  return {
    mesh,
    uniforms,
    data,
    texture,
    /** Upload `source`, optionally hiding voxels not yet acquired. */
    update(source, { order = null, step = 255 } = {}) {
      if (order) {
        for (let i = 0; i < data.length; i++) {
          data[i] = order[i] <= step ? source[i] : 0;
        }
      } else {
        data.set(source);
      }
      texture.needsUpdate = true;
    },
    /** Light up a plane inside the volume, in world units along y. */
    glow(y, { width: w = 0.03, strength = 0.9, color } = {}) {
      uniforms.glowY.value = y / (2 * by);         // box space is -0.5..0.5
      uniforms.glowWidth.value = w / (2 * by);
      uniforms.glowStrength.value = strength;
      if (color) uniforms.glowColor.value.set(color);
    },
    /** Which of MODES to draw. */
    setMode(next) { uniforms.mode.value = next; },
    /**
     * Rebuild the transfer function.
     *
     * `stops` can be replaced too, for a scene that offers a choice of
     * colormap - the isosurface color follows the top of the ramp, since
     * that is the one place the transfer function's own color is no use.
     */
    retune(opts = {}) {
      const { stops: nextStops = stops, ...curveOpts } = opts;
      stops = nextStops;
      const settings = {
        threshold, width, density, curve, points, window, lut, ...curveOpts,
      };
      uniforms.transfer.value.dispose();
      uniforms.transfer.value = transferTexture(stops, settings);
      uniforms.threshold.value = settings.threshold;
      uniforms.isoColor.value.set(stops[stops.length - 1]);
    },
  };
}
