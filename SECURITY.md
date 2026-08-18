# DotaSage Security Baseline

DotaSage v0.15 reads public Dota/OpenDota profile data and optionally a local-only Dota GSI stream. It does not currently authenticate users or store private account data on a DotaSage server.

## Rules for future Steam sign-in

- Never ask for or handle a user's Steam password. Authentication must redirect to Steam and return to a server-side callback.
- Validate the identity response on the server. Do not trust a Steam ID supplied by browser JavaScript as proof of identity.
- After authentication, create a DotaSage session using a server-issued cookie with `HttpOnly`, `Secure`, and an appropriate `SameSite` policy.
- Do not put session tokens, provider secrets, AI API keys, or Steam API keys in React code, browser localStorage, query strings, or the Git repository.
- Rotate secrets through deployment environment variables and keep production/test credentials separated.
- Add CSRF protection for state-changing authenticated endpoints, input validation, authorization checks, rate limiting, and audit logging before saved/private user data is introduced.
- Minimize stored player data. Public match history can be re-fetched; preferences should be stored only when needed.

## v0.5 controls

- Vercel security headers include CSP, frame blocking, nosniff, Referrer-Policy, Permissions-Policy, and HSTS.
- Browser network access is restricted by CSP to DotaSage itself and OpenDota for API reads; images may load over HTTPS for Steam/Dota assets.
- The Game Plan AI route remains server-side. No provider key belongs in the browser.

This is a baseline, not a claim of completed security certification. Authentication, database access, saved settings, and production APIs need their own threat model and tests before launch to other users.

## Local GSI bridge (v0.12 beta)

- The included Node bridge binds to `127.0.0.1`, not `0.0.0.0`, so it is not intentionally exposed to the LAN/Internet.
- Dota posts to the local bridge using a config token. The token is defense-in-depth for a loopback-only prototype, not an Internet credential.
- The bridge stores only the latest game-state payload in process memory and serves a sanitized subset to the local DotaSage browser session.
- DotaSage does not upload the local GSI payload to Vercel or the AI endpoint in v0.15.
- Do not change the bridge binding to a public/LAN address without adding real authentication, origin restrictions, transport security, and threat review.

## v0.16 local companion boundary
The production website and Dota GSI companion are separate processes. The companion binds only to loopback (`127.0.0.1`) and is never intended to listen on `0.0.0.0`. The production UI requires an explicit user click before attempting the localhost connection. Enemy hidden state is not derived from GSI; enemy-item reactions are based only on items the user manually records as observed.
