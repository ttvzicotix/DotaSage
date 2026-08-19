# UI styles

`src/styles.css` is the large legacy stylesheet accumulated during the prototype-to-public-app iterations. New isolated UI work should prefer small files in this directory and be imported after the legacy sheet so overrides remain deliberate.

Current modules:

- `draft-actions.css` — Radiant/Dire, My Pick/Ban, and side-selection hierarchy.
- `player-connection.css` — the browser-local player connection card.

Do not split the legacy stylesheet wholesale without visual/regression coverage; migrate coherent sections incrementally.
