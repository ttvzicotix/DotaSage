# DotaSage v0.14

Theme: readability, trustworthy item planning, and stricter objective pick evidence.

## Draft flow
- Quick Draft is now permanently role-agnostic and always searches the full hero roster.
- Role/position selection lives only in Pick Advisor, where it belongs.
- Quick Draft still supports aliases, ambiguous aliases, one-click Team/Enemy/My Pick/Ban, clear-and-refocus after every add, and the first eight available heroes when search is empty.
- Browse Roster defaults to all heroes and has only an optional Advisor Position scope.

## Pick Advisor
- BEST PICK now weights 60% empirical enemy counter evidence, 35% modeled ally synergy, and 5% meta.
- Personal history remains outside the BEST PICK ranking.
- Counter advantages still accumulate across every entered enemy rather than averaging away a five-hero draft.
- Pick Advisor typography and visual density were increased to reduce empty gray space and improve laptop readability.
- The #1 recommendation now shows a compact five-enemy empirical matchup strip so the combined VS score can be audited hero-by-hero.

## Lane prediction
- Replaced loose per-hero lane guessing with a whole-five assignment optimizer.
- Explicit lane priors and role hints carry more authority than generic tags such as Durable/Initiator.
- Regression case: Anti-Mage / Viper / Tidehunter / Skywrath Mage / Lion resolves to positions 1 / 2 / 3 / 4 / 5 respectively.
- Manual drag-to-correct remains available in Game Plan and corrected lane context continues to drive lane coaching.

## Itemization
- OpenDota item popularity is no longer treated as proof of a six-slot inventory.
- Visible phase rows remain purchase/popularity evidence.
- Inventory targets now use a deeper phase pool plus recursive recipe resolution.
- Obvious intermediate components such as Sacred Relic and Blade of Alacrity are suppressed from final inventory targets.
- Upgrade chains remove consumed components when the later item is present.
- Added an Adaptive Late Target that visibly changes when a tracked enemy item creates a high-priority counter response.
- Enemy item search now clears and immediately refocuses after each add.

## Match context / review
- Local match clock now displays and updates in seconds while running.
- GSI clock can feed fractional minutes into the same timer.
- Retro Coach now calls out a good-lane / bad-midgame transition when lane efficiency is healthy but deaths cluster from 10–30 minutes.
- Retro Coach can flag finishing materially under the lobby-average level as a possible over-rotation / lost-XP pattern.

## Readability
- Replaced the Inter + Rajdhani combination with IBM Plex Sans + Barlow Condensed.
- Increased many previously tiny labels and body-copy sizes across Quick Draft, Pick Advisor, Game Plan, itemization, vision, timeline, and matchup cards.

## Live Sync installer
- Replaced the brittle installer with a simpler fail-visible installer.
- The installer always writes `LIVE_SYNC_INSTALL_LOG.txt`, keeps the window open, searches common Steam paths, and falls back to a manual `game\dota\cfg` folder prompt.
- Successful installs write `LIVE_SYNC_INSTALL_PATH.txt` as before.
- Dota does not need to be closed to copy the config, but it must be restarted after installation so it reads the new GSI file.
