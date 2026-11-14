# Art audit and status (honest)

**The collection art is NOT finished: 332 of 1,000 are approved. 668 are pending. The site shows only the 332 and labels the rest "in production".**

## Audit of the restored V6 drafts
`tools/phash_audit.py` (1024-bit dHash, 33x32; thresholds calibrated on known pairs: <=0.10 near-duplicate, <=0.15 "similar, review"):
the V6 "1,000 drafts" in `legacy/v6-drafts/` collapse to **about 55 visually distinct images** (the rest are recolours/recrops of those). They are **not** usable as 1,000 unique NFTs. Report: `reports/phash_v6_genesis.json`. They are kept in `legacy/` for reference only and are not published or minted.

## What replaced them
The v3 pipeline (`tools/art-pipeline/`, copied from `/workspace/event-horizon/astros/v3`) generates each token from a stable plan (`plan.json`: tier, traits, backdrop, title, seeded with a fixed SEED), runs automated QA (`qa.py`), then manual visual approval (`visual.py`). All 332 approved pieces were re-audited with `tools/phash_audit.py` (report: `reports/phash_v7_approved_332.json`) and are byte-unique and hash-pinned in `art-manifest.json`:
* **Threshold 0.10 (near-duplicate): 0 duplicates, 332 distinct clusters** (closest pair is 0.114 apart).
* **Threshold 0.15 ("similar, review by eye"): 61 images fall into 5 clusters, the largest has 52 members.** These share a composition/pose (same character art style with different suits/backdrops/props), which is expected for a single-style PFP set, but **nobody has yet eyeballed them for "too samey"**. Treat as an open review item, especially as the other 668 are generated: variety in pose/composition is the weak point of this collection.

| Tier | Target | Approved | Pending |
|---|---|---|---|
| Common | 550 | 208 | 342 |
| Uncommon | 250 | 57 | 193 |
| Rare | 120 | 34 | 86 |
| Epic | 60 | 21 | 39 |
| Legendary (incl. five 1/1s) | 20 | 12 | 8 |
| **Total** | **1,000** | **332** | **668** |

Tier targets are encoded in the plan and the manifest (`launch-kit/production-manifest.json`, 1,000 rows, per-tier counts asserted by tests). Metadata for approved tokens is generated; the rest cannot be built until art exists (strict mode refuses).

## Resume plan (exact commands, from repo root)
```bash
cd tools/art-pipeline
python3 status.py                       # per-tier done / pending
python3 next.py 8                       # next 8 pending tokens, interleaved across tiers: prompt + reference images (do the 8 Legendaries first)
#   generate each image from its prompt + listed refs (1:1, >=1024px), save as JPEG, then:
python3 ingest.py 12=/path/a.jpg 13=/path/b.jpg   # copies to raw/, runs QA -> qa_pass | qa_review | qa_fail (fail is auto-rejected)
python3 sheet.py --tokens 12,13 --out check       # contact sheet for eyeballing; look for off-model faces, wrong tier cues, text artefacts
python3 visual.py reject 12 "reason"              # send back to pending, or
python3 visual.py approve [--except 12,30]        # promote reviewed tokens to done
cd ../..
python3 tools/build_collection.py tools/art-pipeline    # rebuilds art/NNNN.jpg, art-manifest.json, assets/astros/*.webp, collection.js, production-manifest.json
python3 tools/phash_audit.py                      # perceptual duplicate audit on everything approved (do before every release)
python3 launch-kit/validate_collection.py         # STRICT: must pass with 1,000/1,000 before any mainnet step
python3 launch-kit/build_metadata.py --image-base https://arweave.net/<images-folder-id>
```
Cost to finish: 668 generations plus rework (v3 so far: 351 generations for 332 accepted, 21 rejected).

## Risks to resolve
* **Character resemblance:** the approved-mockup hero (a slouched, smoking astronaut) reads close to a well-known TV cartoon character's design style. This is a design/IP judgement for you and counsel, not something code can fix. See DECISIONS.md.
* **AI-generated art rights:** copyright status and platform terms for AI-generated images vary by jurisdiction; get advice before sale. Holder license text is not written.
* **Full-resolution art** (`art/`, 146 MB now, about 450 MB at 1,000) is gitignored on purpose. Back it up and put it on permanent storage; the SHA-256 of every file is in `art-manifest.json`.
* **Numbering:** V6 reserved #981-985 for the five 1/1s; v3 numbers tokens by its shuffled plan (Legendary #1 is "The Original"). Decide which scheme is final before uploading metadata.
