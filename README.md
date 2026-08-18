# DotaSage v0.17

Open-source Dota 2 draft intelligence, matchup scoring, Game Plan coaching, optional local live sync, and post-match review.

**Live site:** https://dotasage.vercel.app/

## Public-build privacy

The public repository ships with **no hardcoded player identity, Dota account ID, personal hero preferences, API keys, machine paths, or local match data**. Personalization is loaded only from an explicit local player connection and should remain local or server-side as appropriate.

Do not commit `.env`, `.env.*`, `.vercel/`, install logs, local profile exports, or archived development folders. See `.gitignore` and `SECURITY.md`.

## Repository layout

- `src/` — React app, recommendation engine, UI, and OpenDota/local-GSI clients
- `api/` — server-side API boundaries
- `companion/` — localhost Dota GSI bridge and GSI config
- `scripts/windows/` — all Windows BAT helpers
- `docs/` — setup, data-source, privacy/legal docs, and historical changelogs
- `public/` — static browser assets such as the favicon

Project-level `README.md`, `SECURITY.md`, `CONTRIBUTING.md`, and `LICENSE` stay at the root so GitHub surfaces them normally.

## Local development on Windows

Double-click `scripts/windows/START_DOTASAGE_DEV.bat` or use `npm.cmd run dev`. The launcher uses `npm.cmd`, so the normal PowerShell script-execution-policy problem does not block local development.

## Deployment

GitHub is the source of truth for production releases.

- Repository: `ttvzicotix/DotaSage`
- Production branch: `main`
- Hosting: Vercel
- Production URL: `https://dotasage.vercel.app/`

Pushes to `main` deploy automatically through the connected Vercel project. Manual Vercel deployment BAT files are intentionally gone.

## Player connection

DotaSage does not require a DotaSage account. The left rail has one **PLAYER CONNECTION** box:

- paste a numeric Dota account ID, or
- click **DETECT FROM LIVE SYNC** while the local bridge has a fresh Dota payload.

The connected Dota ID is stored only in that browser's local storage. The local companion derives the public Dota account ID from Valve's player payload and does not expose the full SteamID to the hosted site. Historical profile/match data is then requested from OpenDota.

Steam sign-in is intentionally optional/future work for cross-device identity rather than a requirement to use the app.

## v0.17 focus

- privacy-safe player connection and local Live Sync identity detection
- Vercel Web Analytics integration
- DotaSage-only branding and browser metadata
- GitHub → Vercel automatic production deploys
- repository cleanup: docs/changelogs grouped, BAT helpers grouped, stale legacy prototype removed
- CI build + branding guard

The v0.16 implementation notes are under `docs/changelog/v0.16.md`.

## Important data labels

- **VS / Counter:** empirical OpenDota matchup evidence when available.
- **Synergy:** currently a composition model, not population same-team pair statistics.
- **Meta:** current OpenDota public-stat proxy; a richer patch/bracket/position meta pipeline is still planned.
- **YOU:** personal history and familiarity when a profile is explicitly connected. It does not rank default BEST PICK.

DotaSage should not silently turn modeled synergy into a stronger claim than the evidence supports. Empirical ally-pair synergy remains a major planned data upgrade.

## Item-plan interpretation

OpenDota hero item-popularity data describes what items are purchased in broad game phases. It does **not** prove that the top items formed one exact six-slot inventory in the same match. DotaSage therefore keeps purchase rows separate from recipe-resolved planning snapshots and labels adaptive responses as modeled coaching.

## Local live sync (optional)

1. Run `scripts/windows/INSTALL_LIVE_SYNC.bat` once.
2. Fully restart Dota after installing/changing the GSI config.
3. Run `scripts/windows/START_DOTASAGE_BRIDGE.bat`. It starts **only** `127.0.0.1:31982`.
4. Open the hosted DotaSage site and enter Game Plan.
5. Click **CONNECT LIVE SYNC**. Chrome may ask permission for the hosted page to access a local service on this computer.
6. Use `scripts/windows/CHECK_LIVE_SYNC.bat` if the bridge is online but Dota is not posting.

A Steam launch option is not required when the GSI config is already being read and Dota is successfully POSTing payloads.

The production website and optional loopback GSI bridge are separate pieces by design. Live GSI state should remain on the local computer and should not be uploaded to Vercel or an AI provider.

## Open source / non-commercial

DotaSage's original code is released under the MIT License. Valve/Dota 2 assets, marks, names, and other third-party material are **not** covered by that license. See `LICENSE` and `docs/third-party-notices.md`.

The public project is intended to remain free and non-commercial unless separate rights are obtained or a future implementation removes/replaces content whose commercial use is restricted.

## Legal / attribution

DotaSage is an independent unofficial fan tool and is not affiliated with or endorsed by Valve Corporation. See `docs/legal.md`, `docs/third-party-notices.md`, and `docs/privacy.md`. The included legal language is a development baseline, not legal advice.

## Security

Read `SECURITY.md` before adding Steam login, saved private settings, or a database. Do not place provider/API secrets in React/browser code. Provider keys belong in Vercel environment variables or another server-side secret store.
