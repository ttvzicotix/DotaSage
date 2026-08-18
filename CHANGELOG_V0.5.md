# DotaSage v0.5

## Draft flow
- Quick Draft moved above the pick advisor.
- Quick search can follow **MY ROLE** or switch to **ALL HEROES**.
- The selected position now filters both the Pick Advisor and My Pick search results.
- Full teams now replace the most recent eligible slot when a new hero is added instead of silently refusing the action. The currently locked self pick is preserved when replacing an ally.
- Selecting **My Pick** from a recommendation/search/card opens Game Plan immediately.
- Logo/wordmark click performs a hard UI reset back to a clean draft.

## Pick Advisor
- Rebuilt as a compact coach workspace instead of six oversized cards.
- Default **BEST PICK** is objective Draft Fit first; personal history is advisory only.
- Added modes: BEST PICK, COUNTER, META, FOR YOU, LEARN.
- LEARN intentionally surfaces strong draft fits outside the player's comfort pool.
- Enemy matchup aggregation gives more weight to severe individual counters so recommendations move more when meaningful enemy picks are added.

## Player profile
- Left profile card is clickable.
- Added top-right account/profile control.
- Added full profile modal with all-time stats, most-played heroes, hero win rates, and recent match history with links to OpenDota match pages.

## Draft Pulse
- Timing chart dots now expose native hover tooltips with minute, win rate, and hero-sample count.

## Game Plan
- Fixed full-page scrolling by making Game Plan its own viewport scroll container.
- Itemization now uses the full width.
- Added Inventory Notes beside item phases. Recipe/dismantle notes are only shown when supported by loaded item metadata; no fabricated sell timings.

## Security baseline
- Added SECURITY.md.
- Added deployment headers: CSP, HSTS, frame denial, nosniff, Referrer-Policy, and Permissions-Policy.
- AI/auth secrets remain server-side only.
