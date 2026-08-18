# DotaSage v0.16

Open-source Dota 2 draft intelligence, matchup scoring, Game Plan coaching, optional local live sync, and post-match review.

**Live site:** https://dotasage.vercel.app/

## Public-build privacy

The public repository ships with **no hardcoded player identity, Dota account ID, personal hero preferences, API keys, machine paths, or local match data**. Personalization should be loaded only from an explicit user-selected profile/sign-in flow and should remain local or server-side as appropriate.

Do not commit `.env`, `.env.*`, `.vercel/`, install logs, local profile exports, or archived development folders. See `.gitignore` and `SECURITY.md`.

## Local development on Windows

Double-click `START_DOTASAGE_DEV.bat` or use `npm.cmd run dev`. The launcher uses `npm.cmd`, so the normal PowerShell script-execution-policy problem does not block local development. DotaSage uses the fixed local development port configured in `vite.config.js`.

## Deployment

GitHub should be the source of truth for production releases.

- Repository: `ttvzicotix/DotaSage`
- Production branch: `main`
- Hosting: Vercel
- Production URL: `https://dotasage.vercel.app/`

Once the GitHub repository is connected to the existing Vercel `dotasage` project, pushes to `main` should create production deployments automatically. Manual deployment BAT files are legacy tooling and are not part of the intended release workflow going forward.

## v0.16 focus

- **Hosted site + local bridge are separated.** `START_DOTASAGE_BRIDGE.bat` starts only the loopback GSI companion; it does not launch a duplicate Vite website.
- The hosted Game Plan does **not** probe localhost until the user clicks **Connect Live Sync**. It explains the local permission boundary before Chrome can prompt.
- Live Sync displays hero level, clock, K/D/A, own inventory and neutral item when Valve GSI supplies them. Diagnostic chips expose POST count and payload age.
- Quick Draft / Browse Roster hero controls are literal map-side actions: **Radiant left, Dire right**. The app converts those to your team/enemy based on the chosen player side.
- Observed enemy items feed adaptive inventory **and** tactical coaching/fight adjustments.
- Browser metadata and favicon use the DotaSage identity.
- Existing v0.15 performance, clock-reset, lane, item-recipe and Vercel work is retained.

See `CHANGELOG_V0.16.md` for the detailed pass.

## Important data labels

- **VS / Counter:** empirical OpenDota matchup evidence when available.
- **Synergy:** currently a composition model, not population same-team pair statistics.
- **Meta:** current OpenDota public-stat proxy; a richer patch/bracket/position meta pipeline is still planned.
- **YOU:** personal history and familiarity when a profile is explicitly connected. It does not rank default BEST PICK.

DotaSage should not silently turn modeled synergy into a stronger claim than the evidence supports. Empirical ally-pair synergy remains a major planned data upgrade.

## Item-plan interpretation

OpenDota hero item-popularity data describes what items are purchased in broad game phases. It does **not** prove that the top items formed one exact six-slot inventory in the same match. DotaSage therefore keeps purchase rows separate from recipe-resolved planning snapshots and labels adaptive responses as modeled coaching.

## Local live sync (optional)

1. Run `INSTALL_LIVE_SYNC.bat` once.
2. Fully restart Dota after installing/changing the GSI config.
3. Run `START_DOTASAGE_BRIDGE.bat`. It starts **only** `127.0.0.1:31982`.
4. Open the hosted DotaSage site and enter Game Plan.
5. Click **CONNECT LIVE SYNC**. Chrome may ask permission for the hosted page to access a local service on this computer.
6. Use `CHECK_LIVE_SYNC.bat` if the bridge is online but Dota is not posting.

A Steam launch option is not required when the GSI config is already being read and Dota is successfully POSTing payloads.

The production website and optional loopback GSI bridge are separate pieces by design. Live GSI state should remain on the local computer and should not be uploaded to Vercel or an AI provider.

## Open source / non-commercial

DotaSage's original code is released under the MIT License. Valve/Dota 2 assets, marks, names, and other third-party material are **not** covered by that license. See `LICENSE` and `THIRD_PARTY_NOTICES.md`.

The public project is intended to remain free and non-commercial unless separate rights are obtained or a future implementation removes/replaces content whose commercial use is restricted.

## Legal / attribution

DotaSage is an independent unofficial fan tool and is not affiliated with or endorsed by Valve Corporation. See `LEGAL.md`, `THIRD_PARTY_NOTICES.md`, and `PRIVACY.md`. The included legal language is a development baseline, not legal advice.

## Security

Read `SECURITY.md` before adding Steam login, saved private settings, or a database. Do not place provider/API secrets in React/browser code. Provider keys belong in Vercel environment variables or another server-side secret store.

## Legacy

The original single-file prototype remains under `/legacy` as reference only. Its old hardcoded strategy/item/ability guidance is not authoritative.
