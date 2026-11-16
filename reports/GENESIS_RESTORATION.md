# Genesis artwork restoration checkpoint

The original 426-entry checksum ledger is retained byte for byte in
`launch-kit/historical-art-manifest-v7.json`. It remains the authority for
recovering original files. The active art manifest also lists the newly
reviewed portraits and records their native source dimensions, reference IDs
and hashes, reconstructed backdrop hash, and delivered JPEG hash. The five
verified source JPEGs are preserved separately from their orange derivatives.

The 37 additions use existing pending IDs and their assigned Common or
Uncommon tier. Each is a separate native square generation, normalized to
the same background, checked against the legacy portraits and adjacent batches
for exact and perceptual duplicates, and reviewed visually for framing,
character, edge quality, and traits. Candidate #283 was withheld after
a similarity hit. All seven character types are represented in the additions.
Final population totals and rarity ranks require the complete set.

The existing gallery has 426 legacy entries at 512 px. The scripts stage 1024
px restorations without rewriting their identities or declaring them recovered
originals. Handle background spillage and duplicate-like compositions in the
restoration review before changing gallery or production hashes. A rerun after
orange normalization is required because the old backdrop colors masked
similarity in some legacy pairs. The five native originals have candidate
derivatives, and low-resolution orange-only proofs remain review references.

## Reproduce staging

- `tools/genesis_background.py` reconstructs the #001 background and makes
  background-only proofs. It uses Pillow, NumPy and OpenCV.
- `tools/genesis_super_resolution.py` creates identity-preserving restored
  candidates from the gallery with CPU PyTorch and pinned
  Real-ESRGAN general-x4v3 weights. Stage a few IDs at a time or split a batch
  across outputs using `--ids`. Keep generated candidates outside the site.
- `tools/stage_genesis_candidates.py` stages native independent portrait art
  with token IDs, source references, and traits observed on the candidate.
- `tools/genesis_candidate_qa.py` compares decoded pixel hashes and
  perceptual hashes across full images and central crops.
- `tools/integrate_genesis_batch.py` promotes individually reviewed pending IDs
  and updates the gallery, manifest, tiers and provenance in one workflow.
  Passing automated QA is only the prerequisite for visual review.
- `tools/genesis_batch_queue.py` allocates outstanding type quantities to
  unchanged pending IDs once the gallery classifications are verified.

The restoration branch records interim art work. Mint, storage publication,
and the production deployment remain pending.
