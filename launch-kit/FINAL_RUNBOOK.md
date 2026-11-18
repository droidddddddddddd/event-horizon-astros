# Release runbook
Confirmed: Pump.fun, target 1B, 500 Astros, coordinated release. Price undecided. No actual launch performed.

## Artwork and metadata
Commission or generate original layered artwork with rights. Approve all 500 images individually against the production manifest; do not use cropped preview images as mint assets. Five named legendary slots are reserved. Record actual traits and run validate_collection.py and build_metadata.py. Upload images and JSON to permanent storage; verify every URI. Keep the approved hashes and manifest offline.

## NFT deployment
Use the official Metaplex Candy Machine documentation (https://developers.metaplex.com/candy-machine) and maintained tooling. Select treasury, price, royalty, mint limits, collection authority, reveal policy and creator address. Test on devnet with separate keys: successful mint, rejected mint, sold-out behavior, payment destination, metadata and authority. Have the configuration independently reviewed before mainnet. No private keys in the website. The V7 repo now contains devnet/localnet-tested mint tooling in `mint/` (see mint/README.md); there is still no mainnet deployment.

## Token deployment
Verify current Pump.fun rules on https://pump.fun/ before using the official interface. Verify actual supply, mint, fees and creator holdings on-chain. Do not promise allocation or liquidity not supported by the platform.

## Coordinated release
1. Publish community site in prelaunch mode. Confirm official domain and social links.
2. Obtain rights and legal review, finalize terms and price, approve artwork and metadata, complete devnet and security checks.
3. Prepare both releases and verify official mainnet addresses and mint URL. Cross-platform release is not atomic; if one fails, disclose the actual state and pause promotion.
4. Set launch-config.js fields and approval flags only when evidence exists. Set status live and launchTime to ISO 8601 UTC. Redeploy after the window opens. Verify links on mobile and desktop. Frontend gate is informational, not an on-chain guard.
5. Monitor mint and token activity, impersonation and hosting errors. Never request seed phrases. No guaranteed returns.
