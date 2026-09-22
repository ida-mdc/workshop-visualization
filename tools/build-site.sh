#!/bin/sh
# Build the whole published site: the edition being worked on, every archived
# edition, and the landing page at the root.
#
# An archived edition is built from its tag, with that tag's own theme, and its
# images are pinned to the same tag. The tag is the entire edition - nothing
# about a past edition is kept at HEAD.
#
#   tools/build-site.sh <output-dir> <base-url> [--with-current]
#
# Without --with-current only the landing page and the archives are built,
# which is what the workflow does while the current edition is unpublished.
set -eu

OUT=$1
BASE=$2
WITH_CURRENT=${3:-}

EDITION=${EDITION:-$("$(dirname "$0")/current-edition.sh")}
REPO=${REPO:-ida-mdc/workshop-visualization}

ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT"
rm -rf "$OUT"
mkdir -p "$OUT"
# absolute from here on: the archive builds run hugo from inside a temporary
# worktree, where a relative -d would resolve against that worktree instead
OUT=$(cd "$OUT" && pwd)

if [ "$WITH_CURRENT" = "--with-current" ]; then
  echo "building $EDITION (current) from the working tree"
  SHA=$(git rev-parse HEAD)
  HUGO_PARAMS_IMAGEBASE="https://raw.githubusercontent.com/$REPO/$SHA/static/" \
  HUGO_PARAMS_EDITION="$EDITION" \
    hugo --minify --baseURL "$BASE/$EDITION/" -d "$OUT/$EDITION" >/dev/null
  python3 tools/pin-images.py "$OUT/$EDITION" "$SHA" "$EDITION" "$REPO"
fi

# Every <year>-<name> tag is a published edition, and the tag name is its
# path. Freezing an edition is pushing its tag; nothing here needs editing.
for tag in $(git for-each-ref --format='%(refname:short)' 'refs/tags/[0-9][0-9][0-9][0-9]-*'); do
  if [ "$tag" = "$EDITION" ]; then
    # the edition being worked on is built from the working tree, not its tag
    continue
  fi
  echo "building $tag from its tag"
  work=$(mktemp -d)
  git worktree add --quiet --detach "$work" "$tag"
  git -C "$work" submodule update --init --recursive --quiet
  (cd "$work" && hugo --minify --baseURL "$BASE/$tag/" -d "$OUT/$tag" >/dev/null)
  git worktree remove --force "$work"
  python3 tools/pin-images.py "$OUT/$tag" "$tag" "$tag" "$REPO"
done

cp -r landing/. "$OUT/"
python3 tools/render-landing.py "$OUT/index.html" "$EDITION"
echo "site assembled in $OUT"
