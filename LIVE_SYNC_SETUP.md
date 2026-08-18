# DotaSage Live Sync setup

Live Sync is optional. The hosted site works normally without it.

## One-time setup

1. Fully extract the DotaSage folder.
2. Run `INSTALL_LIVE_SYNC.bat`.
3. Fully exit and restart Dota 2 after the config is installed.
4. Run `START_DOTASAGE_BRIDGE.bat`. This starts only the local companion; it does not start a second website.
5. Open the hosted DotaSage site and enter Game Plan.
6. Click **CONNECT LIVE SYNC**. The page explains that it is connecting only to `127.0.0.1:31982` before the browser permission appears.
7. Enter Demo Hero, a bot lobby, or a real match.
8. Run `CHECK_LIVE_SYNC.bat` if the page still says the bridge is waiting for Dota.

If Dota is already posting payloads, no extra Steam launch option is required. The installed GSI config is the important part.

## What the states mean

- **NOT CONNECTED**: the hosted page has not been given permission to contact the local bridge yet.
- **BRIDGE OFFLINE**: the local Node bridge is not running.
- **BRIDGE ONLINE · WAITING FOR DOTA**: the bridge works, but Dota has not POSTed a fresh GSI payload.
- **DOTA CONNECTED**: Dota is sending fresh local game state.

`CHECK_LIVE_SYNC.bat` reports `postCount`, payload age, parse failures and auth failures.

## Privacy boundary

The bridge binds to `127.0.0.1` only and keeps only the latest GSI payload in memory. The browser reaches it only after the user clicks **Connect Live Sync**. Own hero/player/item/map state can update automatically. Enemy hidden inventory is not pulled from player-mode GSI; enemy-item reactions use items the user manually records as observed.
