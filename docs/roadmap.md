# DotaSage roadmap

This roadmap distinguishes shipped work from work that is only partially validated. DotaSage should not call a feature complete solely because code exists; live behavior and data claims still need evidence.

## Shipped / current baseline

- DotaSage public branding, browser metadata, and favicon.
- GitHub `main` as the production source of truth with automatic Vercel deployment.
- Vercel Web Analytics package integrated in the React root.
- Repository cleanup with documentation under `docs/` and Windows BAT helpers under `scripts/windows/`.
- Quick Draft full-roster search, aliases, map-side Radiant/Dire controls, and role-aware Pick Advisor.
- Objective BEST PICK ranking that keeps personal familiarity outside the primary objective score.
- Empirical OpenDota enemy matchup evidence with five-enemy aggregation.
- Whole-team lane assignment plus manual lane correction in Game Plan.
- Game Plan match clock, phase/objective/vision coaching, item planning, observed enemy-item reactions, and visible post-match review.
- Optional localhost GSI bridge for own hero, level, K/D/A, clock, inventory, neutral item, and diagnostics.
- Manual player connection through a browser-local Dota account ID.
- Browser-local player snapshots and a remembered-player switcher so previously loaded public player summaries survive revisits on the same device.
- Explicit OpenDota refresh controls and saved-data age/source labels.
- A global Live Sync identity guard that warns when the locally detected Dota player differs from the active profile and can switch to the live player explicitly.
- Local privacy controls to forget the active profile or clear remembered player summaries.

## Implemented, needs live validation

### Local player auto-detection
The local companion now attempts to derive the public Dota account ID from Valve's current local player payload and the site exposes **DETECT FROM LIVE SYNC**. Validate this in Demo Hero and a real match on multiple machines/contexts. Manual Dota ID is the required fallback when identity is absent from the payload.

### Player-data availability states
DotaSage now distinguishes saved local summaries from current OpenDota data and explicitly labels the common case where a profile is identified but no public match-history rows are returned. Further work should distinguish every upstream failure mode (private/unavailable, not indexed, transient API failure, and an actual empty result) without pretending one is another.

### CI verification
A GitHub workflow now builds the Vite app and guards against reintroducing the old product name. Confirm Actions execute normally on future pushes/PRs and tighten checks as tests are added.

### Web Analytics
The React integration is shipped. Confirm Web Analytics is enabled for the Vercel project and that production page views appear without attaching Dota IDs, draft content, or local GSI state to custom events.

## Highest-priority product work

### 1. Empirical ally synergy
TEAM/Synergy is still primarily composition modeling. Add population same-team hero-pair evidence with sample size/confidence and clear source labels. Personal pair synergy should be shrunk toward population priors when the player's sample is small.

### 2. Patch + bracket + position meta strength
Replace the broad public-stat proxy with a current-patch pipeline that can distinguish rank bracket and role/position. Keep META as a distinct evidence signal rather than silently mixing it into counter evidence.

### 3. Execution difficulty / risk
Add a separate execution-risk signal. A statistically best hero can remain #1 BEST PICK while DotaSage warns that the hero has high execution burden or low player experience and offers a safer alternative. Do not distort objective BEST PICK to manufacture comfort picks.

### 4. Smarter live coaching
Use live changes instead of only displaying telemetry: item timing completion, level/XP pace, death streaks, phase transitions, BKB/major-item windows, and changes in the user's next objective. Keep live coaching sparse enough to be useful during a match.

### 5. Itemization depth
Continue separating empirical purchase evidence from modeled final inventories. Improve role-specific situational items, current recipe correctness, enemy-item reactions, and live next-target reasoning.

## Next coaching/data layer

### 6. Patch-aware map and ward visualization
Move from zone-only text to a current-map visual layer for ward zones, common deward areas, camps, lane routes, Roshan/Tormentor staging, and objective control. Avoid false pixel-perfect certainty when map geometry changes.

### 7. Deeper post-match review
Use parsed OpenDota/replay timeline evidence where available: death locations/times, item timings, level and net-worth changes, objective swings, fight participation, farm-route loss, and whether the pre-game Game Plan matched the actual game.

### 8. Grounded AI Game Plan
`api/game-plan.js` is currently a server-side grounding boundary, not a connected AI coach. A future provider should receive verified draft/player/match context server-side, keep provider secrets off the client, and distinguish evidence from model inference.

## Identity and account strategy

Basic DotaSage use should remain account-free:

1. Guest use.
2. Manual Dota ID or local Live Sync detection for personalization.
3. Optional Steam OpenID later for cross-device identity/cloud preferences.

Steam sign-in should not become mandatory merely to load public OpenDota history.

## Engineering / privacy work

- Randomize the local GSI authentication token per installation instead of shipping one static token.
- Add automated unit/regression tests for scoring, lane assignment, item recipe resolution, aliases, and player-ID conversion.
- Add release tags/notes once the Git workflow settles.
- Keep Git commit author email privacy configured with a GitHub noreply address.
- Incrementally split the legacy `src/styles.css` only after visual regression coverage protects the current layout.
- Add issue templates when outside contributors/bug reports become frequent enough to justify them.
- Revisit privacy/legal copy before adding Steam sessions, cloud-saved profiles, a database, or any new telemetry.
