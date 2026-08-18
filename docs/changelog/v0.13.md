# DotaSage v0.13

## Drafting
- Quick Draft permanently searches all heroes. Position filters no longer hide allies/enemies/bans from Quick Draft.
- Position still controls ★ My Pick eligibility and Pick Advisor recommendations.
- Browse Roster defaults to all heroes and has an optional roster-only MY POSITION filter.

## Recommendation math
- Benchmarked against DotaPicker's public Advantage Mode behavior and its linked open-source DotaBuffCP counter implementation.
- Enemy matchup advantages now accumulate across selected enemies instead of being averaged.
- BEST PICK weights: 45% counter advantage, 45% modeled ally synergy, 10% meta baseline.
- Personal history remains advisory and does not sort BEST PICK.
- The modern DotaPicker full counter+synergy combining implementation was not copied; DotaSage only adopts the public/open scoring principles we could verify.

## Live Sync diagnostics
- More robust Dota cfg-folder detection.
- Installer creates `gamestate_integration` instead of requiring it to already exist.
- Records the installed path in `LIVE_SYNC_INSTALL_PATH.txt`.
- New `CHECK_LIVE_SYNC.bat`.
- Local bridge adds `/health`.
- Game Plan distinguishes bridge offline, bridge waiting for Dota, and fresh Dota state connected.
