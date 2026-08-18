# DotaSage v0.12

## Match-ready coaching pass

- Pick Advisor no longer stretches into a mostly empty gray panel. Added a compact **Why #1** signal rail and an explicit execution-risk note for low personal samples without changing the objective ranking.
- Predicted lanes are now editable: drag any hero between Top / Mid / Bottom on Game Plan. Your corrected lane updates your lane label and expected lane opponents.
- Added a visible **Post-Match Review** jump button at the top of Game Plan.
- Post-match import now attempts to load the parsed OpenDota match and produces transparent heuristic review notes from available deaths/timing/economy stats.
- Added **DotaSage Local Live Sync (beta)** using Dota 2 Game State Integration:
  - local bridge binds only to `127.0.0.1:31982`
  - game clock can automatically drive Game Plan minute
  - local hero, level, K/D/A, GPM/XPM, and owned items are shown when Dota exposes them
  - no live game state is uploaded by the companion
  - enemy inventory remains manual while playing because normal player-mode GSI does not expose full enemy player data
- Added `INSTALL_LIVE_SYNC.bat` and `START_DOTASAGE_LIVE.bat`.
