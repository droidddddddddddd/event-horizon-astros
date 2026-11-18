# ASTROS mint tooling (Metaplex Core, DEVNET / LOCALNET ONLY)

**Status: prelaunch. Nothing here has been deployed to devnet or mainnet by this repo's author. Mainnet is disabled.**

## What this is
* `src/plan.mjs` — the approved economics, one place: 500 supply (the token IDs in `../launch-kit/supply.json`); `early` 100 @ 0.15 SOL (allowlist, 1/wallet), `public` 390 @ 0.25 SOL (2/wallet), `reserve` 10 @ 0 (address-gated to the disclosed reserve wallet); 2.5% royalty (250 bps).
* `src/deployLogic.mjs` — creates one **Metaplex Core collection** (Royalties plugin, 250 bps, creator = treasury) and **three Core Candy Machines** (early / public / reserve) holding **disjoint** pools of token numbers (seeded shuffle, so the early pool is not always #1–200). Config-line prefix mode: name `Astro #` + 4 chars, uri `<metadataBase>/` + `NNNN.json`. Guards: allowList (Merkle root), solPayment, startDate/endDate, mintLimit, addressGate. `verifyDeployment` re-reads everything from chain and compares with the plan.
* `src/safety.mjs` — cluster detection by **genesis hash** (not by trusting the URL), mainnet refusal, test-URI refusal.
* `src/mintLogic.mjs` + `index.html`/`src/main.js` — a small Phantom test page (devnet/localnet only; re-verifies the machine on-chain before asking for a signature).
* `deploy.mjs` — CLI. Keypair is a **file path outside this repository** (never printed/copied). `--dry-run` validates everything and sends nothing.

## Commands
```bash
npm install
npm test                    # 15 unit + CLI safety tests, no validator needed (needs network for 3 read-only genesis-hash calls; they skip if offline)
npm run validator           # terminal 1: local solana-test-validator with Core + Core Candy Machine dumped from devnet
npm run test:local          # terminal 2: full 100/390/10 deployment + guard/phase/payment behaviour test (30 checks)
node deploy.mjs --dry-run   # validate a deployment.json (copy deployment.example.json; PUBLIC addresses only)
node deploy.mjs --keypair /ABSOLUTE/PATH/OUTSIDE/REPO/devnet-keypair.json   # devnet deploy (needs a funded DEVNET key YOU create; never commit it)
npm run build               # builds the Phantom test page
```

## What has and has not been tested
| | Result |
|---|---|
| Plan arithmetic, cluster/mainnet refusal, test-URI refusal, pool disjointness, config-line limits | **Unit tested, passing** |
| CLI refuses: mainnet by default, mainnetEnabled without a TTY, declared-devnet-vs-mainnet-RPC mismatch, test URIs, in-repo keypair; dry run | **Tested, passing** (spawned process) |
| Full production-size deploy (last run at the old 200/780/20; re-run at 100/390/10 pending) + on-chain verification, guards (allowlist, price, treasury receipt, per-wallet limits, address gate, start/end windows, sold out), 30 checks | **Tested on a LOCAL validator only**, `reports/local-validator-test.json` (30/30). Throwaway wallets were generated in memory, never written to disk or printed. |
| Same flow on **real devnet** | **NOT tested** (needs a funded devnet key outside the repo) |
| Phantom browser mint path (`index.html`) | **Built and loads cleanly under CSP; the wallet/signing path is NOT tested** (no wallet extension in the test box) |
| Marketplace royalty display/enforcement (Magic Eden, Tensor) | **NOT tested** |
| Reveal fairness | Seeded shuffle with a disclosed seed. **Not** cryptographically fair or hidden (see SECURITY_REVIEW.md) |
| Mainnet | **Never run. Disabled.** |

## Mainnet is gated three ways (all must hold; none are set)
1. `"mainnetEnabled": true` in your local `deployment.json`, **and**
2. `launch-config.js` approval flags (`artApproved`, `metadataVerified`, `devnetTested`, `securityReviewed`, `termsApproved`) all true, all 500 art-approved, `metadataBase` on Arweave/IPFS, **and**
3. an interactive terminal where you type the exact confirmation phrase printed by the tool (`MINT ASTROS ON MAINNET` + the first 4 characters of the treasury address).
Cluster is taken from the RPC's genesis hash; a devnet config pointed at a mainnet RPC is refused.

## Before this can ever mint real SOL
See `../SECURITY_REVIEW.md` and `../DECISIONS.md`: finish art (500; 74 left), upload to permanent storage, devnet run with a real wallet, independent review, treasury/reserve/legal decisions.
