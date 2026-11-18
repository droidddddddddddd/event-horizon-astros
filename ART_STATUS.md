# Art audit and status (honest)

**Supply is now 500 (approved by Christopher 2026-11-18; source of truth `launch-kit/supply.json`). The collection art is NOT finished: 426 of 500 are approved. 74 are pending (25 Common, 49 Uncommon). The site shows only the 426 and labels the rest "in production".**

## Audit of the restored V6 drafts
`tools/phash_audit.py` (1024-bit dHash, 33x32; thresholds calibrated on known pairs: <=0.10 near-duplicate, <=0.15 "similar, review"):
the V6 "1,000 drafts" in `legacy/v6-drafts/` collapse to **about 55 visually distinct images** (the rest are recolours/recrops of those). They are **not** usable as unique NFTs. Report: `reports/phash_v6_genesis.json`. They are kept in `legacy/` for reference only and are not published or minted.

## What replaced them
The v3 pipeline (`tools/art-pipeline/`, copied from `/workspace/event-horizon/astros/v3`) generates each token from a stable plan (`plan.json`: tier, traits, backdrop, title, seeded with a fixed SEED), runs automated QA (`qa.py`), then manual visual approval (`visual.py`). All 426 approved pieces were re-audited with `tools/phash_audit.py` (report: `reports/phash_v7_approved_426.json`; the earlier 332-piece report is kept) and are byte-unique and hash-pinned in `art-manifest.json`:
* **Threshold 0.10 (near-duplicate): 0 duplicates, 426 distinct clusters** (closest pair is 0.114 apart).
* **Threshold 0.15 ("similar, review by eye"): 72 images fall into 5 clusters (67 redundant), the largest has 52 members.** These share a composition/pose (same character art style with different suits/backdrops/props), which is expected for a single-style PFP set, but **nobody has yet eyeballed them for "too samey"**. Treat as an open review item, especially as the other 574 are generated: variety in pose/composition is the weak point of this collection.

| Tier | Target | Approved | Pending |
|---|---|---|---|
| Common | 233 | 208 | 25 |
| Uncommon | 106 | 57 | 49 |
| Rare | 81 | 81 | 0 |
| Epic | 60 | 60 | 0 |
| Legendary (incl. five 1/1s) | 20 | 20 | 0 |
| **Total** | **500** | **426** | **74** |

At 1,000 the targets were 550/250/120/60/20. Halving those exactly (275/125/60/30/10) would drop 21 approved Rares, 30 Epics and 10 Legendaries, so Rare/Epic/Legendary are set to the approved art and the remaining 339 are split Common/Uncommon in the old 55:25 ratio. The 74 pending slots are the lowest-numbered pending plan entries of those tiers (`supply.json` `pendingIds`); the other plan entries are out of the collection.

Tier targets are encoded in the plan and the manifest (`launch-kit/supply.json` and `launch-kit/production-manifest.json`, 500 rows, per-tier counts asserted by tests). Metadata for approved tokens is generated; the rest cannot be built until art exists (strict mode refuses).

## Resume plan (exact commands, from repo root)
```bash
cd tools/art-pipeline
python3 status.py                       # per-tier done / pending
python3 next.py 8                       # next 8 pending tokens, interleaved across tiers: prompt + reference images (do the 8 Legendaries first)
#   generate each image from its prompt + listed refs (1:1, >=1024px), save as JPEG, then:
python3 ingest.py 12=/path/a.jpg 13=/path/b.jpg   # copies to raw/, runs QA -> qa_pass | qa_review | qa_fail (fail is auto-rejected)
python3 sheet.py --tokens 12,13 --out check       # contact sheet for eyeballing; look for off-model faces, wrong tier cues, text artefacts
python3 visual.py reject 12 "reason"              # send back to pending, or
python3 visual.py approve --tokens 12,13        # promote reviewed tokens to done
cd ../..
python3 tools/build_collection.py tools/art-pipeline    # rebuilds art/NNNN.jpg, art-manifest.json, assets/astros/*.webp, collection.js, production-manifest.json
python3 tools/phash_audit.py art "*.jpg" --out reports/phash-current.json # full similarity pairs and clusters
python3 launch-kit/validate_collection.py         # STRICT: must pass with 500/500 before any mainnet step
python3 launch-kit/build_metadata.py --image-base https://arweave.net/<images-folder-id>
```
Cost to finish: 74 generations plus rework (v3 so far: 445 generations for 426 accepted, 21 rejected). Rarity tiers Legendary and Epic are complete; Commons and Uncommons are next.

## Risks to resolve
* **Character resemblance:** the original mockup hero (a slouched, smoking astronaut) read close to a well-known TV cartoon character, so it was **replaced with an original generated hero** (drifting astronaut, mirrored visor). The collection Astros themselves share a round-head / heavy-eyelid cartoon look; counsel should review the whole collection for resemblance. See DECISIONS.md.
* **AI-generated art rights:** copyright status and platform terms for AI-generated images vary by jurisdiction; get advice before sale. Holder license text is not written.
* **Full-resolution art** (`art/`, 146 MB now, about 175 MB at 500) is gitignored on purpose. Back it up and put it on permanent storage; the SHA-256 of every file is in `art-manifest.json`.
* **Numbering:** V6 reserved #981-985 for the five 1/1s; v3 numbers tokens by its shuffled plan (Legendary #1 is "The Original"). Decide which scheme is final before uploading metadata.

## Finalization art direction
Preserve the approved Astro face, proportions, distressed retro comic rendering and palette. Do not redesign the collection. Vary silhouette, pose, camera angle, expression, helmet geometry, suit construction, props and narrative action before varying color. Review all 72 flagged images in contact sheets; retain strong originals and regenerate only genuinely redundant compositions. Similarity flags are review candidates, not automatic rejections. Preserve token IDs, tier and five 1/1 identities. Review new art against the entire existing collection, not just its own batch. Do not promote unreviewed art or use recolors to fill supply.
