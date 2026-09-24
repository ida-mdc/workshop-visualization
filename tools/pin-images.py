#!/usr/bin/env python3
"""Point a built edition's images at the repository instead of publishing them.

Hugo writes every image this repository provides into the build. For an
archived edition that would mean a copy of static/img per edition, which is
most of the weight. Instead the pages load them from raw.githubusercontent.com
pinned to the edition's tag - immutable, so the edition keeps the images it was
built with - and the copies are deleted from the build.

Only images this repository provides are touched. The theme ships its own
static/img, and those files are not in this repository, so a raw URL for them
would 404; they stay in the build and are served normally.

    pin-images.py <build-dir> <git-ref> <edition-path> <repo>
"""
import html
import pathlib
import re
import subprocess
import sys

build, ref, path, repo = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
root = pathlib.Path(build)

owned = {
    p[len("static/"):]
    for p in subprocess.run(
        ["git", "ls-tree", "-r", "--name-only", ref, "--", "static/img"],
        capture_output=True, text=True, check=True).stdout.split()
}
raw = f"https://raw.githubusercontent.com/{repo}/{ref}/static/"
# Match however the build wrote the URL. Templates use both absLangURL
# (https://host/workshop-visualization/<edition>/img/x.png) and relURL
# (/workshop-visualization/<edition>/img/x.png), and a local preview uses a
# different host again, so consume everything up to and including the edition
# path - leaving any of it behind would splice the new URL onto the old prefix.
#
# '=' has to be excluded from that prefix. `hugo --minify` leaves attribute
# values unquoted, so the page says `src=/workshop-visualization/...` with no
# quote to stop at - and a prefix allowed to contain '=' swallows the `src=`
# itself, replacing the whole thing with a bare URL. The browser then parses
# the URL as an attribute name and the image silently never loads. Same for
# `content=` on the og:image meta tag.
pattern = re.compile(
    r'[^\s"\'()<>=]*?/' + re.escape(path) + r'/(img/[^\s"\'()<>&]+)')

rewritten = 0
for f in root.rglob("*"):
    if f.suffix not in (".html", ".xml") or not f.is_file():
        continue
    text = f.read_text(errors="ignore")
    new, n = pattern.subn(
        lambda m: raw + m.group(1) if m.group(1) in owned else m.group(0), text)
    if n and new != text:
        f.write_text(new)
        rewritten += n

for name in owned:
    (root / name).unlink(missing_ok=True)
for d in sorted(root.rglob("*"), key=lambda p: -len(p.parts)):
    if d.is_dir() and not any(d.iterdir()):
        d.rmdir()

# the theme ships demo content (lorem ipsum posts and their tag pages) which
# Hugo merges into every build; nothing here links to it
for junk in ("posts", "tags", "categories"):
    d = root / junk
    if d.exists():
        subprocess.run(["rm", "-rf", str(d)], check=True)

print(f"  {path}: pinned {rewritten} image references to {ref}, "
      f"dropped {len(owned)} image files")

missing = [n for n in owned if (root / n).exists()]
if missing:
    sys.exit(f"  {path}: failed to drop {len(missing)} images")
