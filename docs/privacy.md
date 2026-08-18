# DotaSage Privacy Notice

Effective: August 15, 2026

This development build is intentionally data-light.

- DotaSage can request public Dota/OpenDota profile, hero, matchup, and match-history data for the configured account ID.
- API caches and optional post-match feedback can be stored in browser localStorage on the user's device.
- The current development build does not upload post-match feedback to a DotaSage account database.
- If hosted publicly, the hosting provider may process ordinary technical request information under its own privacy policy and terms.
- Steam sign-in is not enabled in this development build.

Before Steam authentication or cloud storage is launched, update this notice to describe the account identifiers stored, session cookies, retention, deletion, security controls, service providers, and user choices.

This development text is a baseline, not legal advice.

## Local live game state (optional)

v0.15 includes an optional local-only Dota Game State Integration bridge. When enabled, Dota can send permitted local game-state fields to `127.0.0.1` on the same computer. DotaSage uses the sanitized local state for match clock, your hero/player stats, and your own observed inventory. The companion does not upload that live GSI payload to DotaSage servers in this build.

## Local Live Sync (v0.16)
Live Sync is opt-in from the Game Plan. The hosted page does not probe the local bridge until the user clicks **Connect Live Sync**. The companion binds to `127.0.0.1:31982`, stores only the latest GSI payload in memory, and does not upload that payload to DotaSage/DotaSage servers. The browser may separately request permission to access a local service because the hosted HTTPS site is connecting to localhost.
