# Coordinated launch
Confirmed preferences: Pump.fun, target 1 billion token supply, simultaneous NFT/token release, NFT price undecided. Platform mechanics and supply must be verified before launch.

1. Approve artwork rights and all 1,000 final images; production-manifest.json is a work order, not finished artwork. Five named legendary slots are IDs 981–985. Add actual visual traits and mark approved only after review.
2. Place final PNGs in launch-kit/art; install Pillow and run build_metadata.py with the verified permanent image base URI. Upload metadata permanently and verify all URIs.
3. Configure maintained Metaplex mint tooling on devnet, choose price, treasury, royalty, mint limits, reveal and authorities; independently test and review. No mint transaction code or credentials are included.
4. Verify current Pump.fun launch rules, supply, fees and creator allocation; use official interface and independently verify the resulting mint.
5. Prepare both releases; publish only verified links. Simultaneous means a coordinated window, not atomic cross-platform execution. If either fails, delay announcement and disclose any already-live asset.
6. Set launch-config.js status live only after both are verified; update official links, terms and privacy. Never store secrets here.

Wallet connection is identity-only; no ownership checks or signing. No live deployment or mint performed.
