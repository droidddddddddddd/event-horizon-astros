# Genesis Phase 1 audit

Inventory from main commit `1a6027ba2e4ab1b7f2503c03cc1e2c563d677be7`, reviewed November 16, 2026.

- The production manifest contains every ID from 1 through 1,000. It lists 426 as approved and 574 as pending. The pending IDs break down into 342 Common, 193 Uncommon, and 39 Rare. No IDs, titles, or tiers were reassigned.
- All 426 approved IDs have readable, byte-unique 512 × 512 WebP previews. Every preview was reviewed in contact sheets. These support composition and similarity review. The final metadata, character types, and rarity ranks remain provisional.
- Five 1024 × 1024 JPEG masters match the original SHA-256 pins. The pipeline reference directory supplies #010, #011, #018, #158, and #179. The checkout, all remote branches and their Git history, and the earlier V6 restore manifest yielded no additional hash matches. The other 421 masters still need recovery. The strict validator reports those missing files.
- The preview dHash scan found zero pairs at or below 0.10, and 75 previews across seven clusters at or below 0.15. The inherited full-resolution report listed 72 flagged images from five clusters. Use that report for historical context and rerun the check on the recovered masters. The preview scans have different inputs and flag different pairs.
- The closest preview pair, #140 and #289, shares a portrait silhouette but has different helmet details, clothing, expression, and accessories. #010, #107, #593, and #597 repeat closely related blue-suit designs and should be prioritized for full-resolution review. #021 and #158 also share a very similar helmet, shoulders, and halo treatment. Preserve all current approved files during review.
- The preview manifest records ten backdrop traits. #001 shows the orange reference, while #007 shows gray. A shared orange master was unavailable. Retain the original named character files and hashes as the source archive. Once the archive and orange master are recovered, review background-only proofs separately, including #007 at the daisy, helmet and straw edges. Hash the finished derivatives separately and recheck similarity after background normalization.
- The existing previews predominantly show humanoid faces or hidden-visor effects. There are no unambiguous dog or cat portraits in this preview pass. Tint, lipstick-like marks, headgear, and oversized eyes also appear as ordinary traits. The preview review could not establish all existing Male, Female, Baby, Robot, or Alien assignments. Do not allocate remaining category quotas until the existing cast has a verified classification.
- The five designated 1/1 titles in the manifest are The Original (#001), Spaghettified (#183), Singularity (#196), Time Dilation (#275), and The Crossed (#287). The Witness (#007) and King (#224) appear in project lore with empty production title fields. Keep the protected roster and designated 1/1 list distinct when reconciling names.

## Resume from the source archive

1. Obtain the full-resolution `art/` archive or the original pipeline `images/` backup, and locate the original orange background layer or source workspace.
2. Run `python3 tools/recover_genesis_art.py /path/to/extracted/backup --restore`. It restores only hash matches and reports missing or conflicting IDs. The five reference files can also be restored without a backup argument.
3. Run `python3 launch-kit/validate_collection.py --allow-partial` and `python3 tools/phash_audit.py art "*.jpg" --out reports/genesis-master-similarity.json`. Finish full-resolution visual review and background proofs before assigning the pending IDs or rebuilding gallery assets.

The mint terms supplied for this production pass are 200 allowlist at 0.15 SOL, 780 public at 0.25 SOL, 20 reserve, and 250 bps royalties. The older economics line in GENESIS_PRODUCTION.md is stale. The audit leaves phase-two implementation for after Phase 1.
