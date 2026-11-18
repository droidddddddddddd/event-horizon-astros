# EVENT HORIZON / ASTROS: V7

Solana NFT collection (420 "Astros", all illustrated; set on 2026-11-18, was 1,000, see `launch-kit/supply.json`) + $ASTRO Pump.fun token plan. **PRELAUNCH CONCEPT PHASE: no live mint, no token on sale.** Never run on mainnet. Hosted in a private GitHub repo (`droidddddddddddd/event-horizon-astros`) so the static site can be previewed on Render; see Deploying.

## Layout
| Path | What |
|---|---|
| `index.html`, `css/`, `js/`, `assets/`, `fonts/`, `data/`, `collection.js`, `launch-config.js`, `astro-config.js`, `privacy.html`, `terms.html` | The static website (single page: Home, Collection, Astro Studio, Mission Control, Roadmap/$ASTRO, FAQ). Matches `design-reference/approved-mockup.png`. |
| `js/studio.js` | Astro Studio: meme maker, PFP creator, frames, styles, caption, export, Black Hole Scene (photo PFP generator ported from $HORIZON) |
| `js/rank.js`, `js/crew.js`, `js/meter.js`, `js/pfp.js` | Ported $HORIZON features rebranded to $ASTRO: rank checker/rank card, crew perks and badges, DexScreener meter, photo PFP. Rank checker and meter stay closed until a verified CA exists. |
| `launch-config.js`, `js/gate.js` | Release gate, fail-closed: every approval flag false |
| `mint/` | Metaplex Core + Core Candy Machine tooling, devnet/localnet only (see `mint/README.md`) |
| `launch-kit/` | `supply.json` (the 420 token IDs, tier split, 6 excluded lookalikes), manifest (420 rows), `validate_collection.py`, `build_metadata.py`, mainnet `preflight.py`, runbooks incl. `PUMPFUN_RUNBOOK.md` |
| `tools/` | build, local server, art pipeline (`art-pipeline/`), pHash audit, collection builder, secret scan, test runner |
| `legacy/` | The restored V6 site and V6 drafts, kept, not published |
| `render.yaml` | Render static blueprint with security headers (prepared only) |
| `ART_STATUS.md`, `SECURITY_REVIEW.md`, `DECISIONS.md` | Read these first |

## Run
```bash
npm run build && npm run serve     # http://127.0.0.1:8802 , same headers/CSP as render.yaml
npm test                           # everything below that can run without a validator
cd mint && npm install && npm run validator   # + (other terminal) npm run test:local
```
Requires Node >=20; Python 3 with Pillow/numpy for audit tools; Playwright + Chrome for `tests/e2e.py`.

## Home hero (random approved Astro)
The hero shows a **different approved Legendary/Epic/Rare Astro on every load** (161 in the pool: 20 Legendary, 60 Epic, 81 Rare; never the same one twice in a row per browser session) in front of the black-hole scene. Real approved art only: `tools/make_hero_cutouts.py` removes the flat backdrop (soft alpha + colour un-mixing, no regeneration) into `assets/hero/<id>-768.webp` / `-384.webp`; `tools/build_hero_pool.py` writes `js/hero.js` from `tools/hero.template.js` (edit `tools/hero_exclude.json` to drop a token). No-JS fallback and `og.jpg` use Astro #1 "The Original". Public origin for canonical/OG/twitter/sitemap lives in `site.config.json` (`siteUrl`; `SITE_URL` env overrides at build).

## Economics (preserved exactly, asserted by tests)
420 NFTs: 202 Common / 57 Uncommon / 81 Rare / 60 Epic / 20 Legendary (incl. five 1/1s). 84 early crew @ 0.15 SOL (allowlist, 1 per wallet), 328 public @ 0.25 SOL (2 per wallet), 8 reserve; max primary raise 94.6 SOL before fees. Six approved Common lookalikes (#11, #119, #176, #223, #266, #296) are excluded; their art stays on disk. Astros keep their original token numbers, so IDs are not contiguous 1..420. 2.5% royalty. Simultaneous Pump.fun launch, 1B supply, $ASTRO.

## Honest status
| Area | State |
|---|---|
| Website, studio, mission control, ported modules | Built; **33/33 desktop + 59/59 responsive/hero/Phantom(mock)/link checks pass** under the strict CSP (375/390/768/1440 px). Real Phantom wallet (browser extension or phone app) **not tested**; only a mocked provider. |
| Art | **420 / 420 approved** (`ART_STATUS.md`). Complete; no more art to make. |
| Metadata | Generated in draft mode for the approved pieces only; strict build can now run (all 420 approved) once a permanent-storage image base exists. |
| Mint (Metaplex Core, 3 machines) | **30/30 local-validator checks pass at the old full 200/780/20 size; not yet re-run at 84/328/8.** Never run on real devnet. Mainnet disabled and triple-gated. |
| Token | Documented runbook only. |
| Security | Self-review plus automated checks; **no independent audit**. 16 moderate npm advisories in mint tooling (transitive). |
| Deploy | `render.yaml` validated and ready (static site); private GitHub repo created; Render service not created yet. |

## Deploying (when you decide to)
1. `git remote add origin <your repo>` and push (not done here). 2. In Render: New > Blueprint > pick the repo (`render.yaml`, static service, build `node tools/build-site.mjs`, publish `dist`). 3. Add the custom domain. 4. Verify headers with `curl -I`. 5. Keep `launch-config.js` in prelaunch state until every item in `DECISIONS.md` marked ◆ is closed and `launch-kit/mint/preflight.py` passes.

## Rules this repo follows
No private keys, seed phrases, RPC keys or passwords in the repo (scanner enforced). Keypairs are file paths outside the repo. Mainnet payments are off.
