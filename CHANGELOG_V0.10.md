# DotaSage v0.10 — Side + Lane Pass

## Added
- Radiant / Dire selector in the live draft.
- Side labels for both teams throughout Draft and Game Plan.
- Swap Teams control for drafts entered backwards. Swapping clears My Pick so an enemy hero is never silently treated as the user.
- Predicted lane map on Game Plan for all ten heroes, with modeled Pos 1–5 assignments.
- User-selected position anchors the user's hero in lane prediction when possible.
- Contact tab in Legal + Attribution identifying Andrew Gungoll as creator.

## Fixed / tightened
- Reworked automatic Game Plan transition so changing or re-selecting a pick in a complete 5v5 can trigger a fresh Game Plan, while Back to Draft does not immediately boomerang back.
- Removed dead vertical space between Quick Draft and Pick Advisor by making the collapsed hero browser size to its content.
- Quick Draft now shows at most 8 starter/search tiles and does not use a horizontal scrollbar.
- Smaller displays progressively show fewer quick tiles rather than creating an internal scroll strip.

## Evidence policy
- Side selection is currently used for map/lane context, not a hidden hero recommendation bonus.
- DotaSage does not yet have sufficiently robust hero-by-side empirical data to claim that Radiant/Dire changes the relative ranking of individual heroes.
- Predicted lanes are modeled from OpenDota hero role tags and the user's selected position; flexible drafts may differ in real matches.

## Contact email
A dedicated DotaSage public email is intentionally not fabricated in this build. Create the actual mailbox first, configure forwarding to the creator's personal inbox if desired, then replace the placeholder in the Contact tab before public deployment.
