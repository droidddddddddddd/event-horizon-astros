# Security review (V7), written by the builder: NOT an independent audit

Scope: the static website, the mint tooling, build/deploy config. Date: 2026-11-14. Method: automated tests, static scans, dependency audit, manual review. **No independent or third-party security review has been done, and none of the mint code has run on devnet with a real wallet or on mainnet.** `securityReviewed` stays `false` in `launch-config.js` and must stay false until a qualified reviewer signs off.

## How to re-run
`npm test` (root: unit/static tests, art integrity, mint preflight, mint tests, browser e2e if the site is served on :8802), `npm run scan` (secret scan), `cd mint && npm audit`, `cd mint && npm run test:local` (needs the local validator).

## Findings

| # | Severity | Finding | Status |
|---|---|---|---|
| 1 | Medium (mint tooling only) | `npm audit` on `mint/`: **16 moderate, 0 high, 0 critical**, all transitive through `@solana/web3.js` via Metaplex Umi: `bn.js` (<4.12.3 infinite loop), `stream-json` (<3.6.0 DoS / prototype pollution), `uuid` (<11.1.1 buffer bounds). `npm audit` reports no fix available without changing Metaplex's dependency choices. Raw: `reports/npm-audit-mint.json`. Exposure: these run in the operator's CLI and in the devnet test page, handling Solana RPC data, not untrusted uploads. The **deployed website has zero npm dependencies**. | **Open / accepted for devnet.** Re-run before mainnet; consider pinning and reviewing, or Umi-only alternatives. |
| 2 | Info | The deployed site (`dist/`) is built from an allow-list of public files only; a test asserts `art/`, `mint/`, `legacy/`, `launch-kit/`, `reports/`, keys and `deployment*` never reach `dist/`. | Fixed by design, tested. |
| 3 | Medium (fixed) | The allowlist Merkle-root comparison in `mint/src/mintLogic.mjs` had a comparison bug found while building the local-validator test; replaced with an explicit element-wise `bytesEqual`. The local test checks that a listed wallet mints and an unlisted wallet is rejected. | Fixed, tested locally only. |
| 4 | Medium (fixed) | Browser mint page initially bundled `node-fetch` and Node `crypto` (page crashed). Fixed by an alias shim and moving the shuffle out of the browser bundle. The page now loads clean under CSP. | Fixed; wallet path untested. |
| 5 | Info | The V6 site (now `legacy/v6-site/`, unpublished) built its gallery with `innerHTML`. Data was static, not user input, but V7 replaced it with DOM + `textContent` everywhere. | Fixed by replacement. |
| 6 | Low | **Fail-open risk in release gate** was checked adversarially: the gate only opens when all six approval flags, `mainnetPaymentsEnabled`, `cluster==="mainnet-beta"`, valid base58 mints, https URLs without credentials, `tokenUrl` exactly `https://pump.fun/coin/<mint>`, a finite price, a passed launch time and `status:"live"` are all true. Test flips each condition individually and also checks the positive case. Note the gate is **informational only**: real enforcement is on-chain Candy Machine guards. | Tested. |
| 7 | Low | Localhost-only demo parameters (`?demo_mcap=`, `?demo_rank=`) exist for design review; they are honoured only when `location.hostname` is localhost/127.0.0.1/[::1] and show a "simulated" banner. Rank perks are cosmetic, stored client-side (sessionStorage), and trivially editable by the visitor by design: **never gate anything of value on them.** | Accepted. |
| 8 | Low | Site calls third parties from the browser: DexScreener (meter, only once a CA is set), public Solana RPCs (`solana-rpc.publicnode.com`, `api.mainnet-beta.solana.com`) for the rank checker (read-only, public address pasted by the user; no wallet connection or signature). `api.mainnet-beta.solana.com` rate-limits browsers (HTTP 429 seen from the test box); publicnode answered. Visitors' IPs are therefore visible to those providers. No Helius or other keyed RPC is in the repo. | Accepted; disclose in privacy page (done). Use a keyed proxy only if needed. |
| 9 | Medium (design) | **Reveal is not fair-by-construction.** Pools are assigned by a seeded shuffle with a disclosed seed; metadata URIs are public, so once metadata is uploaded anyone can compute/look up which token number has which rarity before minting (config lines are readable on-chain). A rarity-sniping advantage exists unless you use a hidden-settings/delayed-reveal design. | **Open, owner decision.** |
| 10 | Medium (design) | Royalties are set (250 bps Royalties plugin, ruleSet None) but are **advisory**: marketplaces may ignore them. Enforcement (allow/deny lists) is a decision with trade-offs. | Open, owner decision, untested on marketplaces. |
| 11 | Info | Mint authority: collection update authority is the deployer. Move to a multisig/hardware wallet and consider revoking after mint. | Open, owner decision. |

## XSS review of Astro Studio and the other inputs (manual + automated)
Inputs: caption top/bottom text, free-text search, uploaded image, format/frame/style selectors, pasted wallet address (rank checker), URL query (localhost only).
* No `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval`, `new Function` or string timers anywhere in `js/` (static test, runs in `npm test`).
* Captions are length-capped (60), stripped of control characters, drawn only with canvas `fillText`; the only DOM sink is an `aria-label` set via `setAttribute` (not parsed as HTML). Browser tests type `<img src=x onerror=alert(1)>` into search and captions: no element injected, no dialog fired.
* Uploads: allow-list PNG/JPEG/WebP/GIF only, 12 MB cap, SVG rejected, decoded through `Image`/canvas and re-encoded on export (strips metadata). Object URLs are revoked.
* Pasted wallet address: validated as base58 32–44 chars before any request.
* CSP blocks inline script and inline styles (`script-src 'self'; style-src 'self'`), `object-src 'none'`, `frame-ancestors 'none'`. Local server applies the same headers from `render.yaml`; e2e asserts zero console/CSP violations and that every request stays same-origin (with no CA set).
* Residual: CSS custom properties are set through the CSSOM (`style.setProperty`), which CSP permits; values come from static config, not user input.

## Headers and Render
`render.yaml` sets CSP (no `unsafe-*`, no wildcards), `nosniff`, `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`, Permissions-Policy, COOP same-origin, HSTS (1 year, includeSubDomains; **do not enable preload** until you control the domain permanently), and long-cache for hashed-free asset paths. **Verified locally against `tools/serve.mjs` only. Not verified on Render itself (nothing was deployed).** After deploying, check with `curl -I` and securityheaders.com. Caveat: `Cache-Control: immutable` on `/assets/*` with unhashed filenames means replaced art may be cached by browsers for a year; rename files or shorten before swapping art.

## Secrets
`tools/secret_scan.py` scans all tracked/untracked-not-ignored files and the full git history for keypair arrays, base58 secret keys, PEM keys, API-key URLs, GitHub/Slack/AWS/OpenAI-style tokens and seed-phrase-like text; **clean** at the time of writing (scanner positive-control tested with a synthetic keypair array and fake API-key URL). `.gitignore` excludes keypairs, `.env*`, `deployment*.json`, `art/`. The Helius key is not in the repo (the only "helius" strings are code comments/patterns in `mint/deploy.mjs` and the scanner). The mint CLI accepts a keypair **path** only, refuses paths inside the repo (tested), never prints it. The local-validator test uses throwaway wallets generated in memory only: never written to disk, never printed, no real funds.

## What was NOT tested
Real-devnet deployment; Phantom signing path; marketplace display/royalties; Render headers live; load/DoS behaviour; dependency provenance (npm supply chain beyond `npm audit`); smart-contract risk in Metaplex programs (audited by Metaplex, not by us); mobile browsers (desktop Chromium only); accessibility audit.

## Before mainnet (security gates)
Independent review of `mint/src` and the deployment config; devnet run with a real wallet and a second device; fix or accept npm findings; decide reveal fairness (#9), royalty enforcement (#10) and authority custody (#11); verify the Render headers live; confirm the typed-confirmation flow with the person who will actually press the button.
