#!/usr/bin/env python3
import random
from pathlib import Path

import click
import moderngl
import numpy as np
import pandas as pd
import tifffile as tiff
from PIL import Image
from scipy import ndimage
from skimage import measure


# -----------------------
# Utilities
# -----------------------
def normalize_channel(a: np.ndarray) -> np.ndarray:
    a_min, a_max = float(a.min()), float(a.max())
    if a_max == a_min:
        return np.zeros_like(a, dtype=np.float32)
    return ((a - a_min) / (a_max - a_min) * 255.0).astype(np.float32)


def randrange(minv, maxv):
    lo, hi = (int(minv), int(maxv)) if minv < maxv else (int(maxv), int(minv))
    return random.randrange(lo, hi)


def get_prog_key(prog, key):
    try:
        return prog[key]
    except KeyError:
        return None


# -----------------------
# Core export
# -----------------------
def export(
    out_dir: Path,
    ch1: np.ndarray,
    ch2: np.ndarray,
    ch3: np.ndarray,
    *,
    seg1_thresh: float,
    seg2_thresh: float,
    label_thresh: float,
    compression: str = "zlib",
):
    out_dir.mkdir(parents=True, exist_ok=True)
    print(f"Exporting to {out_dir}..")

    # Match original normalization + file names
    n1 = normalize_channel(ch1)
    n2 = normalize_channel(ch2)
    n3 = normalize_channel(ch3)

    labeled_image, _ = ndimage.label(n3 > label_thresh)

    tiff.imwrite(out_dir / "raw_channel1.tif", n1, compression=compression)
    tiff.imwrite(out_dir / "raw_channel2.tif", n2, compression=compression)
    tiff.imwrite(out_dir / "raw_channel3.tif", n3, compression=compression)

    tiff.imwrite(
        out_dir / "segmentation_channel1.tif",
        ((ch1 > seg1_thresh) * 255).astype(np.uint8),
        compression=compression,
    )
    tiff.imwrite(
        out_dir / "segmentation_channel2.tif",
        ((ch2 > seg2_thresh) * 255).astype(np.uint8),
        compression=compression,
    )
    tiff.imwrite(out_dir / "labelmap_channel3.tif", labeled_image, compression=compression)

    # Simple, robust measurements (skip axis lengths)
    props = measure.regionprops_table(labeled_image, properties=("label", "area"))
    pd.DataFrame(props).to_csv(out_dir / "analysis_data_channel3.csv", index=False)


# -----------------------
# Shader source (unchanged)
# -----------------------
FRAG_SRC = r"""
#version 330
in vec2 v_text;
out vec4 f_color;
uniform float depth;
uniform float max_width;
uniform float max_height;
uniform float max_depth;
uniform vec3 c1;
uniform vec3 c2;
uniform vec3 c3;
uniform float diff;
const float PI = 3.14159265359;

float rand(vec2 co){
    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

// Simplex 3D Noise by Ian McEwan (Ashima Arts) — shortened for brevity
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
float snoise(vec3 v){
  const vec2  C = vec2(1.0/6.0, 1.0/3.0);
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1. + 3.0 * C.xxx;
  i = mod(i, 289.0 );
  vec4 p = permute( permute( permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
  float n_ = 1.0/7.0; vec3  ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z *ns.z);
  vec4 x_ = floor(j * ns.z);  vec4 y_ = floor(j - 7.0 * x_ );
  vec4 x = x_ *ns.x + ns.yyyy; vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4( x.xy, y.xy ); vec4 b1 = vec4( x.zw, y.zw );
  vec4 s0 = floor(b0)*2.0 + 1.0; vec4 s1 = floor(b1)*2.0 + 1.0; vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy; vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy,h.x); vec3 p1 = vec3(a1.xy,h.y); vec3 p2 = vec3(a1.zw,h.z); vec3 p3 = vec3(a1.zw,h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                dot(p2,x2), dot(p3,x3) ) );
}

float distance(vec3 a, vec3 b) { return length(a - b); }

float calcHull(vec3 p, float radius, vec3 a, vec3 b, vec3 c) {
    return radius / distance(a, p) + radius / distance(b, p) + radius / distance(c, p);
}

float calcDeltaHull(vec3 p, vec3 a, vec3 b, vec3 c, int dim) {
    float x = p.x, y = p.y, z = p.z;
    float mc1 = -(a[dim] - p[dim])/sqrt(pow(a.x - x, 2.) + pow(a.y - y, 2.) + pow(a.z - z, 2.));
    float mc2 = -(b[dim] - p[dim])/sqrt(pow(b.x - x, 2.) + pow(b.y - y, 2.) + pow(b.z - z, 2.));
    float mc3 = -(c[dim] - p[dim])/sqrt(pow(c.x - x, 2.) + pow(c.y - y, 2.) + pow(c.z - z, 2.));
    return mc1 + mc2 + mc3;
}

vec2 fold(vec2 p, float ang){ vec2 n=vec2(cos(-ang),sin(-ang)); p-=2.*min(0.,dot(p,n))*n; return p; }
#define PI 3.14159
const float time = -0.50;
vec2 gen_fold(vec2 pt) { pt = fold(pt,-2.9); pt = fold(pt,.9); pt.y+=sin(time)+1.; pt = fold(pt,-1.0); return pt; }
vec2 gen_curve(vec2 pt) { for(int i=0;i<9;i++){ pt*=2.; pt.x-=1.; pt=gen_fold(pt);} return pt; }
float d2hline(vec2 p){ p.x-=max(0.,min(1.,p.x)); return length(p)*5.; }

const float _time = 0.413;
vec3 tri_fold(vec3 pt) { pt.xy = fold(pt.xy,0.947); pt.yz = fold(pt.yz,-21.338); pt.xy = fold(pt.xy,-0.191); pt.yz = fold(pt.yz,-3.214/3.164+sin(0.413*0.884)/-0.071); return pt; }
vec3 tri_curve(vec3 pt) { for(int i=0;i<10;i++){ pt*=1.592; pt.x-=8.672; pt=tri_fold(pt);} return pt; }
float DE(vec3 p){ p *= 3.0643; p.x+=2.168; p.y-=2.368; p.z+=0.268; p=tri_curve(p); return 5.528*(length( p*0.0028 ) - 0.052); }

void main() {
    float x = (v_text.x * 0.5 + 0.5) * max_width;
    float y = (v_text.y * 0.5 + 0.5) * max_height;
    float z = (depth * 0.5 + 0.5) * max_depth;

    vec3 p = vec3(x, y, z);
    float f = 5.0 / max_depth;
    float res = calcHull(p, diff, c1, c2, c3);
    float resClamped = res, maxSum = 1.8, minSum = 1.5, ramp = 3.3;

    if(res > maxSum) resClamped = max(0.0, maxSum + ramp*maxSum - ramp*res);
    else if(res < minSum) resClamped = max(0.0, minSum + res*ramp - minSum*ramp);

    float dx = calcDeltaHull(p, c1, c2, c3, 0);
    float dy = calcDeltaHull(p, c1, c2, c3, 1);
    float dz = calcDeltaHull(p, c1, c2, c3, 2);

    float roundFactor = 300.0*res;
    float resDiff = float(int(res*roundFactor)) / roundFactor - res;
    vec3 npt = vec3(x + resDiff/dx, y + resDiff/dy, z + resDiff/dz);

    float t = 0.0, dt = 0.618;
    float rx = snoise(vec3((x + t*dt) * f, (y + t*dt) * f, (z + t*dt*0.2) * f));
    float ry = snoise(vec3((x + t*dt*0.34) * f, (y + t*dt) * f*0.94, (z + t*dt) * f*1.04));
    float rz = snoise(vec3((x + t*dt*1.2) * f, (y + t*dt) * f, (z + t*dt) * f*0.7));
    npt.x += float(int(rx * 32));
    npt.y += float(int(ry * 32));
    npt.z += float(int(rz * 32));

    float v1 = res * 15.0;
    float v2 = resClamped * max(0.0, sin(x * 0.085 * resClamped) + cos(y * 0.096 * resClamped) + sin(z * 0.074 * resClamped) - 2.0) * 155.0;

    resClamped = max(0.0, 20.0 * resClamped - abs(distance(npt, p))) * 10.0;
    resClamped *= max(0.0, sin((resClamped-0.85)*30.0));
    float v3 = max(0.0, 255.0 - 255.0 * (DE(vec3(x/max_width, y/max_height, z/max_depth)) * 2.0 - 1.0));

    float bounds = 2.0;
    if(x < bounds || x > max_width-bounds || y < bounds || y > max_height-bounds || z < bounds || z > max_depth-bounds)
        f_color = vec4(0.0, 0.0, 0.0, 1.0);
    else
        f_color = vec4(clamp(v1/255.,0.,1.), clamp(v2/255.,0.,1.), clamp(v3/255.,0.,1.), 1.0);
}
"""

VERT_SRC = r"""
#version 330
in vec2 in_vert;
out vec2 v_text;
void main() {
    gl_Position = vec4(in_vert, 0.0, 1.0);
    v_text = in_vert;
}
"""


# -----------------------
# Main generator
# -----------------------
@click.command()
@click.argument("output_dir", type=click.Path(file_okay=False, dir_okay=True, writable=True))
@click.option("--size", type=int, default=512, show_default=True, help="Width/Height/Depth (voxels).")
@click.option("--backend", type=str, default=None, show_default=True, help='ModernGL backend (e.g., "egl").')
@click.option("--seg1-threshold", type=float, default=40.0, show_default=True, help="Threshold for segmentation_channel1.")
@click.option("--seg2-threshold", type=float, default=252.0, show_default=True, help="Threshold for segmentation_channel2.")
@click.option("--label-threshold", type=float, default=10.0, show_default=True, help="Threshold for labelmap on channel3.")
@click.option("--seed", type=int, default=None, show_default=True, help="Random seed for reproducible centers.")
def generate_data(
    output_dir,
    size,
    backend,
    seg1_threshold,
    seg2_threshold,
    label_threshold,
    seed,
):
    """
    Generate 3-channel synthetic 3D data and derived masks/labels.
    Defaults match the original behavior for identical results.
    """
    out_dir = Path(output_dir)
    if seed is not None:
        random.seed(seed)

    # Moderngl context
    ctx = moderngl.create_standalone_context(backend=backend) if backend else moderngl.create_standalone_context()
    prog = ctx.program(vertex_shader=VERT_SRC, fragment_shader=FRAG_SRC)

    # Uniforms
    depth_u = get_prog_key(prog, "depth")
    max_w = get_prog_key(prog, "max_width")
    max_h = get_prog_key(prog, "max_height")
    max_d = get_prog_key(prog, "max_depth")
    c1 = get_prog_key(prog, "c1")
    c2 = get_prog_key(prog, "c2")
    c3 = get_prog_key(prog, "c3")
    diff_u = get_prog_key(prog, "diff")

    w = h = d = int(size)
    if max_w: max_w.value = w
    if max_h: max_h.value = h
    if max_d: max_d.value = d

    diff = float(size) / 40.0
    center = float(size) / 2.0
    if diff_u: diff_u.value = int(float(size) / 4.0)  # keep original scaling

    if c1:
        c1.value = (
            randrange(center - diff * 2, center - diff),
            randrange(center - diff * 2, center - diff),
            randrange(center - diff * 2, center - diff),
        )
    if c2:
        c2.value = (
            randrange(center - diff, center + diff),
            randrange(center - diff, center + diff),
            randrange(center - diff, center + diff),
        )
    if c3:
        c3.value = (
            randrange(center + diff, center + diff * 2),
            randrange(center + diff, center + diff * 2),
            randrange(center + diff, center + diff * 2),
        )

    # Geometry
    vertices = np.array([-1.0, -1.0,  -1.0, 1.0,  1.0, -1.0,  1.0, 1.0], dtype="f4")
    vbo = ctx.buffer(vertices)
    vao = ctx.simple_vertex_array(prog, vbo, "in_vert")

    # Output volumes
    ch1 = np.zeros((w, h, d), dtype=np.float32)
    ch2 = np.zeros((w, h, d), dtype=np.float32)
    ch3 = np.zeros((w, h, d), dtype=np.float32)

    fbo = ctx.simple_framebuffer((w, h), components=4)
    fbo.use()

    for z in range(d):
        fbo.clear(0.0, 0.0, 0.0, 1.0)
        if depth_u:
            depth_u.value = (float(z) / float(d)) * 2.0 - 1.0
        vao.render(moderngl.TRIANGLE_STRIP)

        # Read back RGBA and split channels
        image = Image.frombytes("RGBA", fbo.size, fbo.read(components=4))
        image = image.transpose(Image.FLIP_TOP_BOTTOM)
        rgba = np.array(image, dtype=np.uint8)

        ch1[:, :, z] = rgba[:, :, 0]  # original mapping
        ch2[:, :, z] = rgba[:, :, 1]
        ch3[:, :, z] = rgba[:, :, 2]

    fbo.release()

    # IMPORTANT: preserve original channel swap on export to keep files identical
    # export(out_dir, output1, output2, output3) was called with (data1, data3, data2)
    export(
        out_dir,
        ch1,          # -> raw_channel1
        ch3,          # -> raw_channel2  (intentional swap)
        ch2,          # -> raw_channel3  (intentional swap)
        seg1_thresh=seg1_threshold,
        seg2_thresh=seg2_threshold,
        label_thresh=label_threshold
    )


if __name__ == "__main__":
    generate_data()
