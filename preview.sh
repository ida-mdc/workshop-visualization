#!/bin/sh
# Build the whole published site locally and serve it: the edition being
# worked on, every archived edition built from its tag, and the landing page.
#
# `hugo server` on its own only builds content/, which is the current edition -
# it never shows the landing page or the archived editions. Use this when you
# want to see the site as published; use `hugo server` while working on decks,
# since it has live reload and this does not.
#
#   ./preview.sh              -> http://localhost:1313/
#   PORT=8000 ./preview.sh    -> http://localhost:8000/
#
# Includes /draft/, the unlinked copy that has `draft: true` pages in it, so
# that what you see here is what the workflow publishes.
#
# Archived editions load their images from raw.githubusercontent.com pinned to
# their tag, so they need network access and the tags need to be pushed.
set -eu

cd "$(dirname "$0")"

PORT=${PORT:-1313}
OUT=${OUT:-site}
EDITION=${EDITION:-$(tools/current-edition.sh)}

tools/build-site.sh "$OUT" "http://localhost:$PORT" --with-current --with-draft

# The landing page does not link the edition being worked on while it is
# unpublished, which would leave no way into it here. Add a banner that only
# ever exists in this preview - the workflow copies landing/ untouched.
python3 - "$OUT/index.html" "$EDITION" <<'BANNER'
import pathlib, sys
page, edition = pathlib.Path(sys.argv[1]), sys.argv[2]
html = page.read_text()
if f'href="{edition}/' not in html:
    banner = (
        '<div style="position:fixed;left:0;right:0;bottom:0;z-index:99;'
        'background:#1c1c1e;color:#fff;padding:12px 16px;text-align:center;'
        'font:14px/1.4 Urbanist,Helvetica,Arial,sans-serif">'
        'Local preview · the ' + edition + ' edition is not published yet · '
        '<a href="' + edition + '/" style="color:#ff8a6f;font-weight:600">'
        'open /' + edition + '/</a></div>'
    )
    page.write_text(html.replace('</body>', banner + '\n</body>', 1))
BANNER

echo
echo "Serving at http://localhost:$PORT/"
echo "Press Ctrl-C to stop."
echo
cd "$OUT" && exec python3 -m http.server "$PORT" --bind 127.0.0.1
