# EVENT HORIZON / ASTROS: V7

Solana NFT collection (1,000 "Astros") + $ASTRO Pump.fun token plan. **PRELAUNCH CONCEPT PHASE: no live mint, no token on sale.** Never run on mainnet. Hosted in a private GitHub repo (`droidddddddddddd/event-horizon-astros`) so the static site can be previewed on Render; see Deploying.

## Layout
| Path | What |
|---|---|
| `index.html`, `css/`, `js/`, `assets/`, `fonts/`, `data/`, `collection.js`, `launch-config.js`, `astro-config.js`, `privacy.html`, `terms.html` | The static website (single page: Home, Collection, Astro Studio, Mission Control, Roadmap/$ASTRO, FAQ). Matches `design-reference/approved-mockup.png`. |
| `js/studio.js` | Astro Studio: meme maker, PFP creator, frames, styles, caption, export, Black Hole Scene (photo PFP generator ported from $HORIZON) |
| `js/rank.js`, `js/crew.js`, `js/meter.js`, `js/pfp.js` | Ported $HORIZON features rebranded to $ASTRO: rank checker/rank card, crew perks and badges, DexScreener meter, photo PFP. Rank checker and meter stay closed until a verified CA exists. |
| `launch-config.js`, `js/gate.js` | Release gate, fail-closed: every approval flag false |
| `mint/` | Metaplex Core + Core Candy Machine tooling, devnet/localnet only (see `mint/README.md`) |
| `launch-kit/` | manifest (1,000 rows), `validate_collection.py`, `build_metadata.py`, mainnet `preflight.py`, runbooks incl. `PUMPFUN_RUNBOOK.md` |
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

## Economics (preserved exactly, asserted by tests)
1,000 NFTs: 550 Common / 250 Uncommon / 120 Rare / 60 Epic / 20 Legendary (incl. five 1/1s). 200 early crew @ 0.025 SOL (allowlist, 1 per wallet), 780 public @ 0.05 SOL (2 per wallet), 20 reserve. 2.5% royalty. Simultaneous Pump.fun launch, 1B supply, $ASTRO.

## Honest status
| Area | State |
|---|---|
| Website, studio, mission control, ported modules | Built; **33/33 browser checks pass** on desktop Chromium under the strict CSP. Phantom connect path and mobile layouts **not tested**. |
| Art | **426 / 1,000 approved**, 574 pending (`ART_STATUS.md`). Not complete. |
| Metadata | Generated in draft mode for the approved pieces only; strict build refuses until 1,000 exist. |
| Mint (Metaplex Core, 3 machines) | **30/30 local-validator checks pass at full 200/780/20 size.** Never run on real devnet. Mainnet disabled and triple-gated. |
| Token | Documented runbook only. |
| Security | Self-review plus automated checks; **no independent audit**. 16 moderate npm advisories in mint tooling (transitive). |
| Deploy | `render.yaml` validated and ready (static site); private GitHub repo created; Render service not created yet. |

## Deploying (when you decide to)
1. `git remote add origin <your repo>` and push (not done here). 2. In Render: New > Blueprint > pick the repo (`render.yaml`, static service, build `node tools/build-site.mjs`, publish `dist`). 3. Add the custom domain. 4. Verify headers with `curl -I`. 5. Keep `launch-config.js` in prelaunch state until every item in `DECISIONS.md` marked ◆ is closed and `launch-kit/mint/preflight.py` passes.

## Rules this repo follows
No private keys, seed phrases, RPC keys or passwords in the repo (scanner enforced). Keypairs are file paths outside the repo. Mainnet payments are off.
