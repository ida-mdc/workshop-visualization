#!/usr/bin/env python3
"""A screenshot of <model-viewer> showing the Armadillo glTF.

The "one mesh for anyone to look at" card wants a picture of the thing it
recommends, taken from the thing it recommends - a static host, a .glb and
one custom element, nothing else. So this writes that page, serves it on a
loopback port, drives a headless Chrome at it and crops the result.

Needs tools/make-armadillo-glb.py to have run, and `google-chrome` plus
ImageMagick's `convert` on PATH.

    tools/make-model-viewer-shot.py [out-file]

Default out-file is static/img/model-viewer-armadillo.png.
"""
import http.server
import shutil
import socketserver
import subprocess
import sys
import tempfile
import threading
from pathlib import Path

GLB = Path("static/data/armadillo.glb")
MODEL_VIEWER = ("https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/"
                "model-viewer.min.js")

PAGE = f"""<!doctype html><html><head><meta charset=utf-8>
<script type="module" src="{MODEL_VIEWER}"></script>
<style>html,body{{margin:0;height:100%;background:#fbfbfd}}
model-viewer{{width:100%;height:100vh}}</style>
</head><body>
<model-viewer src="armadillo.glb" camera-controls
  camera-orbit="200deg 72deg 100%" shadow-intensity="1.4" exposure="0.85"
  environment-image="neutral" interaction-prompt="none"></model-viewer>
</body></html>
"""


def serve(directory: Path):
    handler = lambda *a, **k: http.server.SimpleHTTPRequestHandler(
        *a, directory=str(directory), **k)
    httpd = socketserver.TCPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, httpd.server_address[1]


def main(out: Path):
    with tempfile.TemporaryDirectory() as tmp:
        work = Path(tmp)
        shutil.copy(GLB, work / "armadillo.glb")
        (work / "index.html").write_text(PAGE)
        httpd, port = serve(work)
        shot = work / "shot.png"
        subprocess.run([
            "google-chrome", "--headless=new", "--disable-gpu", "--no-sandbox",
            "--enable-unsafe-swiftshader", "--use-gl=angle",
            "--use-angle=swiftshader", f"--user-data-dir={work / 'profile'}",
            "--window-size=1100,900", "--virtual-time-budget=25000",
            f"--screenshot={shot}", f"http://127.0.0.1:{port}/",
        ], check=True, capture_output=True)
        httpd.shutdown()
        # Trim the flat background, then put a little of it back so the
        # drop shadow is not cut off at the feet.
        subprocess.run(["convert", str(shot), "-trim", "+repage",
                        "-bordercolor", "#fbfbfd", "-border", "24",
                        str(out)], check=True)
    print(f"wrote {out}")


if __name__ == "__main__":
    main(Path(sys.argv[1]) if len(sys.argv) > 1
         else Path("static/img/model-viewer-armadillo.png"))
