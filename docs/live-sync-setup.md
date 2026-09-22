# DotaSage Live Sync setup

Live Sync is optional. The hosted site works normally without it.

## One-time setup

1. Fully extract or sync the DotaSage repository.
2. Run `scripts/windows/INSTALL_LIVE_SYNC.bat`.
3. Fully exit and restart Dota 2 after the config is installed.
4. Run `scripts/windows/START_DOTASAGE_BRIDGE.bat`. This starts only the local companion; it does not start a second website.
5. Open the hosted DotaSage site.
6. On the Draft screen, click **AUTO DRAFT** to allow the page to contact only `127.0.0.1:31982`.
7. Enter hero selection, Demo Hero, a bot lobby, or a real match. When Valve exposes draft data, Radiant/Dire picks and bans populate automatically.
8. Game Plan uses the same Live Sync permission for clock, hero, K/D/A and inventory data.
9. Run `scripts/windows/CHECK_LIVE_SYNC.bat` if the page still says the bridge is waiting for Dota.

If Dota is already posting payloads, no extra Steam launch option is required. The installed GSI config is the important part.

## Player connection

The left rail has a **PLAYER CONNECTION** box. You can either enter your numeric Dota account ID or choose **DETECT FROM LIVE SYNC**.

When Valve's current local player payload includes an account identifier, the DotaSage companion exposes only the derived public Dota account ID to the website. It does not send the full SteamID to the hosted site. If the current GSI context does not provide an identifier, manual Dota ID entry remains the fallback.

The selected Dota ID is saved only in that browser's local storage and is then used to request public profile/history data from OpenDota.

## What the states mean

- **NOT CONNECTED**: the hosted page has not been given permission to contact the local bridge yet.
- **BRIDGE OFFLINE**: the local Node bridge is not running.
- **BRIDGE ONLINE · WAITING FOR DOTA**: the bridge works, but Dota has not POSTed a fresh GSI payload.
- **DOTA CONNECTED**: Dota is sending fresh local game state.
- **AUTO READY**: the local bridge is reachable; DotaSage is waiting for a draft payload.
- **AUTO LIVE**: Valve is exposing current draft picks/bans and DotaSage is syncing them into the board.

`scripts/windows/CHECK_LIVE_SYNC.bat` reports `postCount`, payload age, parse failures and auth failures.

## Privacy boundary

The bridge binds to `127.0.0.1` only and keeps only the latest GSI payload in memory. The browser reaches it only after an explicit local connection action. Own hero/player/item/map state can update automatically. Draft picks/bans are consumed only when Valve includes the GSI `draft` payload for the current mode/context. Full spectator-only player data is not assumed. Enemy hidden inventory is not pulled from player-mode GSI; enemy-item reactions use items the user manually records as observed.
