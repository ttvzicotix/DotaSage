# DotaSage v0.11

## Match-aware coaching pass
- Added optional live match minute + Ahead/Even/Behind context.
- Added a one-click browser match clock that can drive phase-aware coaching without constant manual updates.
- Added side-aware Vision + Map Control coaching for laning, map opening, objective windows, and late game.
- Added objective conversion prompts that react to time and game state.
- Added optional OpenDota latest-match import to post-match feedback so real K/D/A, duration and result can be stored with the local coaching feedback.
- Kept the current Game Plan / item / lane / observed enemy item systems intact.
- Package ZIP now contains a top-level `dotasage-react-v0.11/` folder for cleaner extraction.

### Data honesty
Vision recommendations are zone/objective models, not claims that a specific ward pixel is always correct. Dota map geometry and deward patterns change.
