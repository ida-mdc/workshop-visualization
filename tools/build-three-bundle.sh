#!/bin/sh
# Rebuild static/js/vendor/three.bundle.js.
#
# The interactive illustrations in the slides need three.js and OrbitControls.
# Both are vendored rather than loaded from a CDN, because a workshop room's
# network is not something to bet a talk on, and because an archived edition
# should still work years later - the tag is the whole edition.
#
# three.js stopped shipping a minified build, and its examples import the bare
# specifier "three", which a browser cannot resolve without an import map.
# Bundling solves both at once: one minified ES module, no import map, and
# every three.js export plus OrbitControls and mergeGeometries available from
# it.
#
#   tools/build-three-bundle.sh [version]
#
# The output is committed. Run this only to change the three.js version - and
# check the illustrations still render afterwards, in the deck view as well as
# on the scrolling page.
set -eu

VERSION=${1:-0.186.0}
ROOT=$(cd "$(dirname "$0")/.." && pwd)
OUT="$ROOT/static/js/vendor/three.bundle.js"

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

echo "fetching three@$VERSION"
curl -sSf -o "$WORK/three.tgz" \
  "https://registry.npmjs.org/three/-/three-$VERSION.tgz"
tar xzf "$WORK/three.tgz" -C "$WORK"
PKG="$WORK/package"

# The examples import the bare specifier "three"; point them at the build they
# are sitting next to so esbuild can resolve it without an import map.
for f in "$PKG/examples/jsm/controls/OrbitControls.js" \
         "$PKG/examples/jsm/utils/BufferGeometryUtils.js"; do
  sed -i "s#from 'three'#from '../../../build/three.module.js'#g" "$f"
done

cat > "$WORK/entry.js" <<EOF
export * from './package/build/three.module.js';
export { OrbitControls } from './package/examples/jsm/controls/OrbitControls.js';
export { mergeGeometries } from './package/examples/jsm/utils/BufferGeometryUtils.js';
EOF

npx --yes esbuild@0.24.2 "$WORK/entry.js" \
  --bundle --format=esm --minify --legal-comments=none --outfile="$OUT"

echo "wrote $OUT ($(wc -c < "$OUT") bytes, three@$VERSION)"
