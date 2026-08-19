# Contributing to DotaSage

DotaSage is an experimental, free and non-commercial Dota 2 draft/coaching companion.

## Ground rules

- Keep recommendations evidence-aware. Do not present modeled scores as empirical statistics.
- Do not commit API keys, Steam credentials, Vercel secrets, private match data, or other sensitive information.
- Do not add Valve-owned assets directly to the repository unless their redistribution is clearly permitted. Prefer runtime references to approved public sources where appropriate.
- Keep Live Sync local-only by default. Any change that sends GSI state off the player's machine requires explicit design/security review.
- Preserve the unofficial/non-affiliation notice.

## Development

```bash
npm install
npm run dev
```

Production verification:

```bash
npm run build
```

On Windows, maintained helper scripts live under `scripts/windows/`. They use `.cmd` variants where needed to avoid common PowerShell execution-policy issues. Production deployment itself is GitHub → Vercel and does not require a deployment BAT file.

## Pull requests

Keep PRs focused. Explain:

1. what changed,
2. why it changed,
3. what evidence or data source supports recommendation/scoring changes, and
4. how the change was tested.

Project questions can go to `dotasage.contact@gmail.com`; security-sensitive reports should follow `SECURITY.md` instead of being posted publicly.
