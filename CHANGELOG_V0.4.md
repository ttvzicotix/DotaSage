# DotaSage v0.4

## Selection workflow
- Best Picks for You is the main workspace.
- Position presets: Flex, Safe/1, Mid/2, Off/3, Support/4, Hard Support/5, Jungle, Roam.
- Full hero roster is collapsed by default.
- Quick hero search dropdown exposes Team, Enemy, My Pick and Ban actions.
- Expanded roster uses larger, readable portrait cards.

## Data reliability
- Selected hero Game Plan fetches that hero's matchup table directly.
- Missing/failed matchup data is shown as unavailable, never as fake 0.0 / 0-sample evidence.
- OpenDota responses are cached in localStorage with TTLs and retried on transient/rate-limit failures.

## Game Plan
- Hero art/name overlap fixed.
- OpenDota item popularity + item assets render as a baseline item build.
- Matchup threat/opportunity cards use verified samples only.
- Teamfight flow is generated from role/composition tags and explicitly labeled as modeled.

## Draft Pulse
- Timing & Power Shape now uses OpenDota hero duration data.
- Chart is labeled as average individual hero duration performance, not team win probability.
