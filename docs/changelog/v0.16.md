# DotaSage v0.16

## Hosted-site / local-companion split
- `START_DOTASAGE_BRIDGE.bat` starts only the localhost GSI bridge.
- `START_DOTASAGE_LIVE.bat` is now a backwards-compatible bridge-only wrapper. It no longer starts Vite.
- The normal local development server remains available through `START_DOTASAGE.bat`.
- Hosted usage is centered on `dotasage.vercel.app` plus the optional local bridge.

## Permission clarity
- The Game Plan no longer probes localhost immediately.
- Live Sync starts only after the user clicks **Connect Live Sync**.
- Before that click, DotaSage explains that the connection is only to `127.0.0.1:31982`, what Valve GSI data is used, and that the bridge does not scan LAN devices or upload live state.
- Connect / Disconnect controls and GSI diagnostics were added.

## Live data
- The live panel surfaces hero level, game clock, K/D/A and automatic own inventory when Valve GSI supplies them.
- Neutral items are preserved and displayed separately from normal inventory slots.
- Diagnostic chips show GSI POST count, payload age, level and item-row count.

## Draft controls
- Hero add controls are now map-side controls: Radiant is always left, Dire always right.
- The buttons map back to YOUR TEAM / ENEMY automatically from the selected player side.
- This makes swapping Radiant/Dire visually consistent across Quick Draft, Browse Roster, Draft Board and Game Plan.

## Enemy observed items
- Observed enemy items still update adaptive item targets.
- They now also feed the Coach Queue and a live tactical-adjustment board.
- Common observed items can alter fight guidance for accuracy, BKB windows, Linken breaks, defensive saves, sustain, Lotus reflection and team mitigation.

## Browser identity
- Added `/public/favicon.svg` and head metadata so Chrome no longer falls back to the generic gray globe.

## Vercel release helper
- `DEPLOY_PROD_VERCEL.bat` now auto-links a freshly extracted version folder to the existing lowercase `dotasage` Vercel project before deploying when `.vercel/project.json` is absent.
