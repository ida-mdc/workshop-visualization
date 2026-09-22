#!/usr/bin/env python3
"""Fill the landing page's edition list from the tags.

Every <year>-<name> tag is a published edition and the tag name is its path,
so the list needs no maintaining: tag an edition and it appears.

    2025-workshop   ->  /2025-workshop/   row "2025  Workshop  <annotation>"

Rows are ordered by each edition's own date - the `date` in its front matter,
which is when the event happened, not when the tag was made.

    render-landing.py <index.html> <current-edition>
"""
import html
import pathlib
import re
import subprocess
import sys

page, current = pathlib.Path(sys.argv[1]), sys.argv[2]


def git(*args):
    return subprocess.run(["git", *args], capture_output=True, text=True).stdout


rows = []
for line in git("for-each-ref", "--format=%(refname:short)\t%(contents:subject)",
                "refs/tags/[0-9][0-9][0-9][0-9]-*").splitlines():
    tag, _, subject = line.partition("\t")
    if not tag or tag == current:
        continue  # still being worked on; the featured card covers it
    front = git("show", f"{tag}:content/_index.md")
    when = re.search(r"^date:\s*(\S+)", front, re.M)
    year, _, name = tag.partition("-")
    rows.append((when.group(1) if when else "", year, name.replace("-", " ").title(),
                 f"{tag}/", subject.strip()))

rows.sort(reverse=True)  # most recent event first

markup = "\n".join(
    f'      <a class="edition" href="{html.escape(path)}">\n'
    f'        <span class="year">{html.escape(year)}</span>\n'
    f'        <span class="name">{html.escape(name)}</span>\n'
    f'        <span class="meta">{html.escape(meta)}</span>\n'
    f'      </a>'
    for _, year, name, path, meta in rows)

text = page.read_text()
marker = '    <div class="past-list"></div>'
if marker not in text:
    sys.exit("landing: generation marker not found")
page.write_text(text.replace(
    marker, f'    <div class="past-list">\n{markup}\n    </div>', 1))
print(f"  landing: {len(rows)} earlier editions")
