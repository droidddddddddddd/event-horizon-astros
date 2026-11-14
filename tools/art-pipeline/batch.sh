#!/bin/bash
# usage: batch.sh "commit message"
set -e
cd "$(dirname "$0")"
python3 visual.py approve | tail -3
python3 status.py | tail -12
./sync_v3.sh >/dev/null
cd ../..
python3 tools/build_collection.py tools/art-pipeline | tail -3
python3 launch-kit/validate_collection.py --allow-partial | tail -3
git add -A
git -c user.name="Grok Bot" -c user.email="grok-bot@users.noreply.invalid" commit -q -m "$1" && echo committed
