#!/usr/bin/env python3
"""Screenshots of the public viewers the "just open a link" slide links to.

A tile on that slide is a picture of the page its link opens, so the pictures
have to come from the pages themselves. Chrome's own --screenshot fires at the
load event, which is far too early for a viewer that streams its data, and
--virtual-time-budget never settles on a page with a continuous render loop -
so this drives Chrome over the DevTools protocol instead and gives each page
real seconds before capturing.

Needs `google-chrome`, `websockets` and ImageMagick's `convert`.

    tools/make-viewer-tiles.py [out-dir]

Writes tile-potree-lion.png and tile-model-viewer.png into static/img.
The third tile on that slide, the H01 cortex in Neuroglancer, is the deck's
existing img/the-human-brain.png - streaming a petabyte-scale segmentation
under a software rasterizer is not something to re-run on a whim.
"""
import asyncio
import base64
import json
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.request
from pathlib import Path

import websockets

PORT = 9333

# url, output name, seconds to wait, crop passed to `convert -crop`
TILES = [
    ("https://potree.github.io/potree/examples/lion.html",
     "tile-potree-lion.png", 45, "820x720+300+30"),
    ("https://modelviewer.dev/",
     "tile-model-viewer.png", 25, "530x760+845+10"),
]


async def capture(url, out: Path, wait: float, crop: str, w=1400, h=900):
    profile = tempfile.mkdtemp()
    chrome = subprocess.Popen([
        "google-chrome", "--headless=new", "--disable-gpu", "--no-sandbox",
        "--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader",
        f"--user-data-dir={profile}", f"--window-size={w},{h}",
        f"--remote-debugging-port={PORT}", "about:blank",
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        endpoint = None
        for _ in range(60):
            try:
                tabs = json.load(urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json"))
                endpoint = next(t for t in tabs if t["type"] == "page")["webSocketDebuggerUrl"]
                break
            except Exception:
                time.sleep(0.5)
        if not endpoint:
            raise RuntimeError("devtools never came up")

        async with websockets.connect(endpoint, max_size=200_000_000) as ws:
            counter = 0

            async def call(method, params=None):
                nonlocal counter
                counter += 1
                await ws.send(json.dumps({"id": counter, "method": method,
                                          "params": params or {}}))
                while True:
                    message = json.loads(await ws.recv())
                    if message.get("id") == counter:
                        return message.get("result", {})

            await call("Page.enable")
            await call("Page.navigate", {"url": url})
            await asyncio.sleep(wait)
            shot = await call("Page.captureScreenshot", {"format": "png"})

        raw = Path(tempfile.mkdtemp()) / "raw.png"
        raw.write_bytes(base64.b64decode(shot["data"]))
        subprocess.run(["convert", str(raw), "-crop", crop, "+repage", str(out)],
                       check=True)
        print(f"wrote {out}")
    finally:
        chrome.terminate()
        shutil.rmtree(profile, ignore_errors=True)


def main(out_dir: Path):
    out_dir.mkdir(parents=True, exist_ok=True)
    for url, name, wait, crop in TILES:
        asyncio.run(capture(url, out_dir / name, wait, crop))


if __name__ == "__main__":
    main(Path(sys.argv[1]) if len(sys.argv) > 1 else Path("static/img"))
