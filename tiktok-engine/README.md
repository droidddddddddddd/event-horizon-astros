# ASTROS TikTok Content Engine — MVP

**Status: editorial workflow scaffold, NOT a deployed video generation or auto-posting service.**

Six independently checkpointed stages: Scout (07:00 ET), Writer (09:00), Director (11:00), Editor (15:00), Publisher (19:00), Analyst (00:00, previous day's episode). An hourly GitHub Action uses America/New_York so daylight saving time is handled. GitHub scheduled actions may run late.

Run locally: `python3 tiktok-engine/engine.py --stage scout --force`, then `--stage writer --force` etc. Files are stored under `tiktok-engine/runs/YYYY-MM-DD/run.json`.

- Scout: reads public Reddit RSS feeds as a **fallback research source**, not TikTok/X trend verification. Feed failures block the pipeline instead of fabricating stories.
- Writer: produces an editable, **unverified** ASTROS dialogue draft, not AI-generated original creative writing yet.
- Director: produces five shot prompts (not rendered shots). Use approved ASTROS portraits as reference; no NFT artwork is modified.
- Editor: creates an edit specification; no MP4 rendered yet.
- Publisher: creates a **manual approval queue only**. Does not publish, comment, or access TikTok.
- Analyst: placeholder awaiting genuine TikTok analytics; no invented views or retention.

## Required for production
1. Confirm approved ASTROS character portraits, voice IDs and commercial rights.
2. Connect a supported text model and licensed video/voice generation services; configure keys as GitHub Actions secrets, never commit credentials.
3. Store generated videos in object storage, not Git.
4. Add FFmpeg video assembly, captions, audio loudness checks, 9:16 QA and real hook variants.
5. Verify TikTok API publishing eligibility and authorization; add human approval and platform-compliant AI disclosure.
6. Add authenticated metrics ingestion and real feedback-driven ranking.
7. Replace or expand RSS with compliant TikTok trend research and verified X/Reddit signals.
8. For production, replace Git-committed run state with durable database/object storage and monitoring.

**Safety:** no posting, no paid API calls, no minting, no changes to website/NFT assets. No fake statistics or unverified news claims should be published.
