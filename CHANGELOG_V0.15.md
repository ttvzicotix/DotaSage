# DotaSage v0.15

Stability, map-side correctness, live-state isolation, and first Vercel-preview preparation.

## Draft / side correctness
- Radiant is rendered on the left and Dire on the right everywhere the two teams are compared.
- Selecting Dire now physically moves the user's heroes to the Dire side rather than only changing the side label.
- Game Plan team strips follow the same literal map-side order.
- Existing manual team swap remains available for a draft entered backwards.

## Match clock
- A genuinely new draft signature resets match context to 0:00 and EVEN.
- Swapping side/team order does not count as a new match and does not wipe current context.
- Manual clock supports 0–120 minutes and has RESET 0:00.
- The seconds display now ticks in an isolated child component.
- Game Plan coaching state updates only at coarse intervals instead of forcing the entire screen to rerender every second.

## Local Live Sync
- Live GSI polling moved into an isolated component so it does not repaint the full Game Plan every poll.
- Parent state changes only when the user's inventory changes or the live clock crosses a coarse bucket.
- The user's own GSI inventory now feeds a LIVE NEXT TARGETS board automatically.
- Enemy item tracking remains manual/observational.
- The localhost bridge exposes diagnostic counters: POST count, payload age, auth failures, parse failures, last POST and last error.
- The bridge logs the first inbound Dota POST and periodic later POSTs.
- Installer searches Steam registry/default/library paths, creates the GSI directory, logs its work and records the final install path.
- Setup now prominently requires `-gamestateintegration` in Dota launch options and a full Dota restart after config installation.
- `CHECK_LIVE_SYNC.bat` separates: bridge offline, bridge waiting for Dota, stale payload, and working connection.

## Performance / readability
- Large Game Plan cards use `content-visibility:auto` so off-screen sections can skip most paint work.
- Reduced expensive Game Plan shadow effects.
- Raised contrast and text sizing on remaining match, lane, live-sync and item microcopy.

## Vercel preview preparation
- Added `DEPLOY_VERCEL.bat` and `DEPLOY_VERCEL.md`.
- Deployment script runs a production Vite build first and then invokes Vercel preview deployment.
- CSP allows the explicit localhost companion endpoints and no longer includes `upgrade-insecure-requests`, which would be hostile to an HTTP loopback bridge.
- Hosted-web-to-local-companion behavior must still be validated in the target browser before Live Sync is called production-ready.

## Verification
- JSX/JavaScript parser regression pass.
- Node syntax check for the GSI bridge.
- Lane-assignment regression retained for AM / Viper / Tidehunter / Skywrath / Lion.
- Radiant/Dire lane-orientation regression retained.
