# DotaSage Security Baseline

DotaSage v0.17 reads public Dota/OpenDota profile data and can optionally consume a local-only Dota Game State Integration stream. It does not currently authenticate users or store private account data in a DotaSage database.

## Reporting a security issue

Email `dotasage.contact@gmail.com` with `SECURITY` in the subject. Please do not post working exploit details, secrets, or private-user data in a public GitHub issue.

For ordinary bugs and feature requests, use GitHub Issues instead.

## Current player-identity boundary

- Basic use does not require a DotaSage account.
- A numeric public Dota account ID can be stored in the user's browser localStorage for personalization.
- The local GSI companion can derive that public account ID from Valve's local player payload when the necessary identifier is present.
- A browser-supplied Dota account ID is **not authentication** and must never be treated as proof that a user owns that Steam/Dota identity.

## Rules for future Steam sign-in

- Never ask for or handle a user's Steam password. Authentication must redirect to Steam and return to a server-side callback.
- Validate the identity response on the server. Do not trust a Steam ID supplied by browser JavaScript as proof of identity.
- After authentication, create a DotaSage session using a server-issued cookie with `HttpOnly`, `Secure`, and an appropriate `SameSite` policy.
- Do not put session tokens, provider secrets, AI API keys, or Steam API keys in React code, browser localStorage, query strings, or the Git repository.
- Rotate secrets through deployment environment variables and keep production/test credentials separated.
- Add CSRF protection for state-changing authenticated endpoints, input validation, authorization checks, rate limiting, and audit logging before saved/private user data is introduced.
- Minimize stored player data. Public match history can be re-fetched; preferences should be stored only when needed.

## Hosted application controls

- Vercel security headers include CSP, frame blocking, nosniff, Referrer-Policy, Permissions-Policy, and HSTS.
- Browser network access is restricted by CSP to the endpoints intentionally required by the app.
- The Game Plan AI route remains server-side. No provider key belongs in the browser.
- Vercel Web Analytics is integrated for basic site traffic. The current app does not intentionally attach Dota account IDs, draft contents, or local GSI payloads to custom analytics events.

## Local GSI companion

- The included Node bridge binds to `127.0.0.1`, not `0.0.0.0`, so it is not intentionally exposed to the LAN or Internet.
- Dota posts to the local bridge using a config token. The current static token is defense-in-depth for a loopback-only prototype and remains scheduled to become per-install randomized.
- The bridge stores only the latest game-state payload in process memory and serves a sanitized subset to the local DotaSage browser session.
- The production UI requires an explicit user action before attempting the localhost connection.
- Enemy hidden state is not derived from player-mode GSI; enemy-item reactions are based only on items the user manually records as observed.
- Live GSI state is not intentionally uploaded to Vercel or the AI endpoint by the current Live Sync path.
- Do not change the bridge binding to a public/LAN address without adding real authentication, origin restrictions, transport security, and threat review.

This is a baseline, not a claim of completed security certification. Authentication, database access, saved private settings, and production AI APIs need their own threat model and tests before launch to other users.
