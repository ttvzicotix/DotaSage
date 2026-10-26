# Evidence-preserving recommendation variety

Best Pick alone uses a deterministic diversity pass after position eligibility and picked/banned exclusions. Counter, Meta, For You and Learn retain their stated objectives.

The top numerical draft-fit hero is fixed. For each subsequent slot, only candidates within 0.35 points (on the 0–10 scale) of the next numerical leader may move forward. A maximum 0.30-point role-overlap penalty favors a different strategic mix among those candidates. Coverage must be at least as complete as the leader's; a verified worst matchup below -4 cannot be promoted over a safer leader. Scores displayed to the user remain unchanged. Numeric hero IDs break otherwise exact ties. There is no random rotation or hero blacklist.

Role tags are a coarse strategic proxy, not evidence of a lane or a guaranteed answer to an enemy ability. Position eligibility remains authoritative upstream. Empty role tags earn no novelty reward. A hero can and should remain first across many drafts when its evidence warrants it.

Repeated picks can arise from aggregate counter saturation at ±10, fallback role-synergy saturation, shared role tags, missing empirical coverage and unchanged role-meta data. This change does not rewrite the empirical score model to manufacture different winners. It improves close alternatives; live provider calibration and patch-specific performance still need real match evidence.

Regression coverage includes controlled enemy-composition matchup fixtures through the production scoring functions, allied composition fallback, incomplete coverage, unsafe direct matchups, strict score gaps, determinism, position eligibility, bans and repeated justified winners. These fixtures are synthetic tests, not claims of current live hero strength.

# Delivery and search visibility

This branch integrates PR #20 and #22, resolving their GamePlan conflict by retaining the pure tested conditional-items engine plus advanced-only presentation and upgrade paths. It replaces #20's inline diversity helper.

Roster is bundled immediately, refreshed independently of stats; network calls have bounded timeouts. Hero portraits try a second Steam CDN before showing a readable name. Build choices remain public popularity evidence plus automatic enemy ability/trend heuristics; observed purchases are optional corrections, not a required input. No live enemy inventory is inferred as fact.

The production homepage returned 200 without authentication during inspection. Project protection settings alone were therefore insufficient evidence of a public indexing block and were left unchanged. Added canonical, sitemap, robots and meaningful initial HTML. After deployment, verify a URL-prefix property for https://dotasage.vercel.app/ in Google Search Console, submit /sitemap.xml and inspect/request indexing of the homepage. This requires the owner's Search Console account; indexing is not guaranteed and no paid domain is required. Preview protection is unchanged.
