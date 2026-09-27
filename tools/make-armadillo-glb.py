#!/usr/bin/env python3
"""The Armadillo as a single glTF binary, for the "anyone can open it" example.

Reads a level written by tools/make-armadillo-mesh.py - uint32 vertex count,
uint32 index count, then float32 positions, float32 normals, uint32 indices -
and repacks it as a .glb. That layout is already exactly what glTF wants, so
the whole job is writing the JSON header around the bytes; no mesh library is
involved, and none has to be installed.

    tools/make-armadillo-glb.py [level] [out-file]

Default level 1 (40,000 triangles) to static/data/armadillo.glb.
"""
import json
import struct
import sys
from pathlib import Path

SRC = Path("static/data/armadillo")


def pad(b: bytes, fill: bytes) -> bytes:
    return b + fill * (-len(b) % 4)


def main(level: int, out: Path):
    raw = (SRC / f"level-{level}.bin").read_bytes()
    n_vert, n_index = struct.unpack_from("<II", raw, 0)
    o = 8
    positions = raw[o:o + n_vert * 12]; o += n_vert * 12
    normals = raw[o:o + n_vert * 12]; o += n_vert * 12
    indices = raw[o:o + n_index * 4]

    # Bounds: glTF requires min/max on the POSITION accessor.
    xyz = struct.unpack(f"<{n_vert * 3}f", positions)
    lo = [min(xyz[i::3]) for i in range(3)]
    hi = [max(xyz[i::3]) for i in range(3)]

    buf = pad(positions, b"\0") + pad(normals, b"\0") + pad(indices, b"\0")
    gltf = {
        "asset": {"version": "2.0",
                  "generator": "workshop-visualization/tools/make-armadillo-glb.py"},
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0, "name": "armadillo"}],
        "meshes": [{"primitives": [{"attributes": {"POSITION": 0, "NORMAL": 1},
                                    "indices": 2, "material": 0}]}],
        "materials": [{
            "pbrMetallicRoughness": {
                "baseColorFactor": [0.72, 0.70, 0.66, 1.0],
                "metallicFactor": 0.0, "roughnessFactor": 0.65,
            },
            "name": "plaster",
        }],
        "accessors": [
            {"bufferView": 0, "componentType": 5126, "count": n_vert,
             "type": "VEC3", "min": lo, "max": hi},
            {"bufferView": 1, "componentType": 5126, "count": n_vert, "type": "VEC3"},
            {"bufferView": 2, "componentType": 5125, "count": n_index, "type": "SCALAR"},
        ],
        "bufferViews": [
            {"buffer": 0, "byteOffset": 0, "byteLength": len(positions), "target": 34962},
            {"buffer": 0, "byteOffset": len(pad(positions, b"\0")),
             "byteLength": len(normals), "target": 34962},
            {"buffer": 0,
             "byteOffset": len(pad(positions, b"\0")) + len(pad(normals, b"\0")),
             "byteLength": len(indices), "target": 34963},
        ],
        "buffers": [{"byteLength": len(buf)}],
    }

    js = pad(json.dumps(gltf, separators=(",", ":")).encode(), b" ")
    chunks = (struct.pack("<II", len(js), 0x4E4F534A) + js
              + struct.pack("<II", len(buf), 0x004E4942) + buf)
    out.write_bytes(struct.pack("<III", 0x46546C67, 2, 12 + len(chunks)) + chunks)
    print(f"wrote {out}: {n_vert} vertices, {n_index // 3} triangles, "
          f"{out.stat().st_size / 1e6:.2f} MB")


if __name__ == "__main__":
    args = sys.argv[1:]
    main(int(args[0]) if args else 1,
         Path(args[1]) if len(args) > 1 else Path("static/data/armadillo.glb"))
