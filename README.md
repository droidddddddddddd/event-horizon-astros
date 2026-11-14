# EVENT HORIZON / ASTROS
Static website MVP. No dependencies, backend, wallet or live token. Open index.html or deploy the entire directory to GitHub Pages / Render Static Site (publish directory `.`; no build command). For local HTTP: `python -m http.server 8000`.

## Included
50 cropped concept portraits from supplied sheets, searchable explorer, planned rarity counts, animated black hole, local photo/PFP and meme studio with PNG export, X text sharing (attach saved image manually), local mission checklist and lore. No uploads leave the browser. Source images are previews, not final mint art. The 5 extra legendary crops are not used in the gallery.

## Launch gates
Confirm brand rights and original art rights; create and review 1,000 distinct final assets, including 550 common, 250 uncommon, 120 rare, 60 epic and 20 legendary (including five 1/1s). Generate final metadata only after art approval. Choose audited Solana mint tooling, test on devnet, verify authority and supply, publish actual contract and terms. No tokenomics or mint date is assumed. Add official links, privacy policy, accessibility review, hosting and monitoring. Local mission progress is not verified or rewarded; server-side accounts, dynamic NFTs and on-chain functionality are future work.

## Creative playbook
Common: tired crew, patched suits, coffee, bandages. Uncommon: bagholder, insider, party degen, ridiculous glasses. Rare: cybernetic eyes, diamond gloves, chrome suits. Epic: plasma mutation, alien features, fractured helmets. Legendary: Original, Spaghettified, Singularity, Time Dilation, Crossed. Keep silhouette and face consistent. Publish reaction art before mint; invite fans to create memes; release weekly mission logs. Avoid paid engagement deception or financial promises.

## V3
See launch-kit/RELEASE_V3.md for confirmed launch preferences, art production manifest and metadata builder. Optional Phantom identity connection added. Existing art remains concept previews.

## V4
Release gate blocks sale links unless all manual approval flags, addresses, price, date and official URLs are populated. It is not a security boundary or blockchain verifier. See launch-kit/FINAL_RUNBOOK.md. Artwork and on-chain deployment remain outstanding. Deploy the website in prelaunch mode only.

## V5
Approved pricing and allocation are now reflected in site config and mint plan. See `launch-kit/mint/DEPLOY.md` and run `python launch-kit/mint/preflight.py`. This is a fail-closed planning validator, not an on-chain deployment script. Final artwork, actual guard setup, wallet addresses and integration testing remain blockers.

## V6 draft collection
The explorer now includes 1,000 individually exported 512px WebP concept variations from the supplied 55 source portraits, using color treatments and mission insignia. These are NOT 1,000 independently illustrated NFTs, nor are the 20 legendary entries individually illustrated 1/1s. Source sheets are included for reproducibility. Draft metadata uses local relative paths, not permanent storage. The original production manifest and release gate intentionally remain unapproved. Do not mint these drafts. Run `python launch-kit/generate_drafts.py` to regenerate, and `python launch-kit/validate_collection.py genesis-draft.json` to check counts and file hashes. Visual quality, source rights, final 1024px art, permanent metadata, actual mint implementation, treasury, devnet and security review remain required. Existing website wallet connection is identity only.
