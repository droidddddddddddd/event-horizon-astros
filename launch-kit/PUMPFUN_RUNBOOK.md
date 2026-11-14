# Pump.fun token launch runbook ($ASTRO), DOCUMENTED ONLY, NOT EXECUTED

Nothing in this repository launches, buys, or signs anything on Pump.fun. This is a checklist for the **owner** to run by hand through the official Pump.fun UI after the gates in `DECISIONS.md` are closed. Rules and fees on Pump.fun change: **re-verify everything on https://pump.fun/ the day of launch** (this runbook cannot do that for you).

Planned parameters (from the approved handoff): platform Pump.fun, target supply 1,000,000,000, ticker `$ASTRO`, launched **simultaneously** with the NFT public/early mint window. Allocation, vesting, creator buy, liquidity: **undecided** (do not promise any that Pump.fun cannot enforce).

## Before
1. Decide and write down: creator wallet (a fresh wallet that is NOT the NFT treasury), initial creator buy (if any, disclose it), token image/name/description/socials, and whether any holder perk depends on the token (the site's rank/crew perks are cosmetic and soft-gated; they promise no value).
2. Confirm the website is still in prelaunch mode and every approval flag in `launch-config.js` is false until verification below is done.
3. Do a dry rehearsal with a throwaway token on a wallet holding only dust you can afford to lose; confirm the UI flow, fee and authority behaviour.
4. Prepare to publish the **verified** mint address from two independent sources (Pump.fun page + a Solana explorer). Scammers copy tickers within minutes: announce only that address, from the official X account.

## Launch (owner, by hand)
1. Create the token in the Pump.fun UI from the creator wallet. Record the mint address.
2. Verify on a Solana explorer: supply is 1,000,000,000 (at the platform's decimals), mint authority and freeze authority are revoked/absent per the platform's design, creator holdings match what you intend to disclose.
3. Within the same window, confirm the NFT early-crew phase starts (start dates are fixed on-chain in the Core Candy Machine guards; the token launch is not atomic with it, so if one side fails, announce the real state and pause promotion).
4. Update `launch-config.js` **only after** evidence exists: `tokenMint`, `tokenUrl` = `https://pump.fun/coin/<mint>`, `cluster: "mainnet-beta"`, flags true, `status: "live"`, `launchTime`. The site's gate and the DexScreener meter then switch on (they use that address only). Rebuild and redeploy.
5. Monitor: impersonators, fake mint links, wallet-drainer replies. Never ask holders for seed phrases; Astros staff never DM first.

## Not covered / your decision
Legal classification of the token and NFT sale in your jurisdiction, tax, marketing claims, market-making, and any liquidity commitments. No financial advice, no promised returns.
