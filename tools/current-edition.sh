#!/bin/sh
# Print the year of the edition currently being worked on.
# The single place this is defined is params.edition in config.toml.
set -eu
cd "$(dirname "$0")/.."
sed -n 's/^edition = "\([^"]*\)".*/\1/p' config.toml | head -1
