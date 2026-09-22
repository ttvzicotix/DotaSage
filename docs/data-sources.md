# DotaSage data-source policy

Patch-sensitive Dota knowledge is expiring data, not permanent hardcoded truth.

## Current runtime sources

- **Valve / Dota 2 official:** patch identity and patch notes when a patch-sensitive fact is verified.
- **OpenDota `/api/heroes`:** runtime hero roster, hero IDs, primary attributes, and broad roles.
- **OpenDota `/api/heroStats`:** baseline public pick/win statistics used to normalize matchup expectations and provide the current meta proxy.
- **OpenDota `/api/heroes/{id}/matchups`:** observed matchup samples used for empirical pair counter evidence.
- **OpenDota `/api/players/{accountId}` + `/heroes` + `/matches`:** public player identity, hero history, and lazily paged public match rows.
- **OpenDota `/api/heroes/{id}/itemPopularity`:** broad purchase popularity by game phase.
- **OpenDota `/api/constants/items`:** current item identity, art, costs, and recipe/component structure used to validate and resolve item plans.

## Current scoring labels

- **Counter / VS:** empirical OpenDota pair evidence when samples are available. Entered enemy advantages accumulate across the enemy lineup.
- **Synergy:** currently modeled from roles/composition. It is deliberately not called empirical same-team synergy.
- **Meta:** OpenDota public-stat proxy.
- **Personal:** the configured player's public hero history/preferences; advisory rather than default BEST PICK evidence.

v0.14 weights BEST PICK toward verified counter evidence while empirical ally-pair synergy is still missing.

## DotaPicker / open-source benchmarking

DotaSage uses DotaPicker and the older open-source DotaBuffCP implementation as a **scoring-design benchmark**, not as a runtime data source. The useful structural idea is that entered matchup advantages can accumulate across the draft and that counter/synergy should remain visible as distinct concepts. DotaSage does not claim to reproduce DotaPicker's current proprietary/production formula exactly.

## Item-plan caveat

OpenDota item-popularity phases are purchase-frequency data, not a record of one exact six-slot inventory. v0.14 therefore:

- shows popularity rows as popularity rows;
- uses a deeper phase pool plus recursive recipe resolution for planning snapshots;
- removes consumed components when a later recipe item is present;
- suppresses obvious dangling components from final inventory targets;
- labels reactive/adaptive item responses as modeled coaching rather than empirical item-win-rate claims.

## Future data priorities

1. Reliable current-patch empirical ally-pair synergy.
2. Position/bracket/recency-aware live meta.
3. Better build-state/item-timing evidence than broad purchase popularity.
4. Richer parsed-match postgame diagnostics.

## Explicitly rejected as authoritative

The strategy, item, and skill strings embedded in `legacy/dota2-draft-analyzer.html` are historical prototype data. They must not be presented as current-patch coaching without fresh verification.

## Staleness rule

If a patch-sensitive source cannot establish freshness, DotaSage should show the value as unavailable/fallback/heuristic rather than invent a current statistic.


## Provider resilience plan

OpenDota remains useful, but it should not be a single point of failure.

Recommended provider roles:

- **STRATZ GraphQL:** preferred secondary/advanced analytics provider for current hero positions, public player history, item/build analysis, lane outcomes, synergies and counters. Requires a STRATZ API token and should be called server-side so the token never reaches the browser.
- **Valve Steam Web API:** official fallback for basic public match history and match details. It requires a Steam Web API key. Player-specific match history still fails when the player hides match history, so it is an availability fallback rather than a privacy bypass.
- **OpenDota:** community provider for public player history, matchup tables, hero stats, constants and replay-derived detail where available.
- **Local Dota GSI companion:** first choice for the user's current local draft/game state. This avoids remote API latency and does not require historical player data. When Valve exposes the `draft` section, DotaSage can ingest Radiant/Dire picks and bans directly.

A future provider adapter should return both the value and provenance (provider, timestamp/freshness, sample size where relevant), then fall through providers by capability rather than pretending every provider exposes equivalent data.

## Privacy limitation

No remote provider can reliably reconstruct a player's hidden personal match history when Valve does not expose that account in public match data. Switching from OpenDota to STRATZ or the Steam Web API can improve uptime and analytics coverage, but it does not override the player's Dota privacy setting.
