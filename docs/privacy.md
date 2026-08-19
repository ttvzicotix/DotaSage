# DotaSage Privacy Notice

Effective: August 18, 2026

DotaSage v0.17 is intentionally data-light.

## Browser-local data

The current app can store the following on the user's device:

- the public Dota account ID the user explicitly connects,
- API response caches,
- selected draft/match-session preferences, and
- optional post-match feedback.

The current build does not provide a DotaSage account database or cloud-synced player profile.

## Public game data

When a user connects a Dota account ID, DotaSage can request public profile, hero, matchup, and match-history information from OpenDota. OpenDota coverage can be incomplete and is governed by that service's own availability and terms.

A manually entered Dota account ID is a public game identifier. It is not authentication and is not proof that the person using the browser owns that Steam/Dota identity.

## Local Live Sync

Live Sync is optional. Dota can send permitted local game-state fields to the DotaSage companion on `127.0.0.1:31982` on the same computer. The companion keeps only the latest payload in memory and serves a sanitized subset to the browser.

The hosted page contacts that loopback service only after an explicit local connection action. The current Live Sync path does not intentionally upload the local GSI payload to Vercel, OpenDota, or an AI provider. Enemy hidden inventory is not obtained from normal player-mode GSI.

When Valve's local player payload includes a usable identity field, the companion can derive the public Dota account ID for optional profile detection. The hosted site does not need the full Steam64 identifier for that flow.

## Hosting and analytics

DotaSage is hosted on Vercel and includes Vercel Web Analytics for basic site-traffic measurement. Vercel may process ordinary technical request/analytics information under its own policies and service terms.

The current DotaSage code does not intentionally attach a Dota account ID, draft contents, or local GSI payload to custom analytics events.

## Future accounts

Steam sign-in is not enabled in v0.17. Before account authentication, cloud storage, or private saved preferences are launched, this notice should be updated to describe sessions, identifiers stored server-side, retention, deletion, security controls, service providers, and user choices.

## Contact

Privacy questions can be sent to `dotasage.contact@gmail.com`.

This development text is a baseline, not legal advice.
