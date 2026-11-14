#!/usr/bin/env bash
# Mirror this pipeline's state (manifest, images, raw, rejected) into the original v3 dir so both stay in sync.
set -e; H="$(cd "$(dirname "$0")" && pwd)"; V3=/workspace/event-horizon/astros/v3
for d in images raw rejected; do [ -d "$H/$d" ] && { mkdir -p "$V3/$d"; cp -au "$H/$d/." "$V3/$d/"; }; done
cp "$H/manifest.json" "$V3/manifest.json"; echo "synced to $V3"
